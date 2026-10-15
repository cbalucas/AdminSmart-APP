-- Bloque 3 · Protecciones contables y reglas que dependen de varias filas.
-- Se ejecuta DESPUÉS de bloque3_3_politicas.sql.
--
-- Las políticas RLS dicen QUÉ FILAS puede tocar cada rol; estos triggers dicen QUÉ CAMPOS y
-- CUÁNDO. Un usuario sin sesión (clave de servicio o editor SQL) tiene `auth.uid()` nulo y no
-- queda sujeto a las limitaciones por rol, pero sí a las contables (nada se borra, solo inserción).

-- ============================================================ nada se borra
create function app.prohibir_borrado() returns trigger
language plpgsql set search_path = ''
as $$
begin
  raise exception 'Nada se borra (%): la baja es lógica y toda corrección es un contramovimiento.', tg_table_name
    using errcode = 'P0001';
end;
$$;

do $$
declare
  tabla text;
begin
  foreach tabla in array array[
    'pago', 'cobro_alquiler', 'movimiento', 'liquidacion', 'liquidacion_total',
    'resumen_deposito', 'resumen_deposito_monto', 'envio', 'auditoria', 'numeracion'
  ] loop
    execute format(
      'create trigger %I before delete on public.%I for each row execute function app.prohibir_borrado()',
      tabla || '_sin_borrado', tabla
    );
  end loop;
end;
$$;

-- AUD-02: nadie edita ni borra la auditoría.
create function app.auditoria_inmutable() returns trigger
language plpgsql set search_path = ''
as $$
begin
  raise exception 'La auditoría no se edita ni se borra (AUD-02).' using errcode = 'P0001';
end;
$$;

create trigger auditoria_inmutable before update on public.auditoria
  for each row execute function app.auditoria_inmutable();

-- ============================================================ registros contables: solo inserción
-- Solo pueden cambiar los campos listados; todo lo demás se corrige con un contramovimiento.
create function app.limitar_modificacion() returns trigger
language plpgsql set search_path = ''
as $$
declare
  v_permitidos text[] := tg_argv;
begin
  if (to_jsonb(new) - v_permitidos - 'updated_at' - 'version')
     is distinct from (to_jsonb(old) - v_permitidos - 'updated_at' - 'version') then
    raise exception 'Registro contable (%): solo pueden modificarse %. Una corrección se registra como anulación o contramovimiento (RN-05).',
      tg_table_name, array_to_string(v_permitidos, ', ')
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger movimiento_solo_insercion before update on public.movimiento
  for each row execute function app.limitar_modificacion('liquidacion_id');
create trigger pago_solo_insercion before update on public.pago
  for each row execute function app.limitar_modificacion(
    'anulado', 'anulacion_motivo', 'anulacion_fecha', 'anulacion_usuario_id', 'en_conflicto');
create trigger cobro_alquiler_solo_insercion before update on public.cobro_alquiler
  for each row execute function app.limitar_modificacion(
    'anulado', 'anulacion_motivo', 'anulacion_fecha', 'anulacion_usuario_id', 'en_conflicto', 'recibo_numero');

-- Anulaciones (PAG-05/06, COB-07, OBL-06): solo el administrador anula (el operador no anula);
-- una anulación no se revierte; no se anula en un período ya liquidado.
-- Argumentos: columna de anulación y tipo de origen de los movimientos ('pago', 'cobro' o 'obligacion').
create function app.controlar_anulacion() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_col text := tg_argv[0];
  v_origen text := tg_argv[1];
  v_antes boolean := (to_jsonb(old) ->> v_col)::boolean;
  v_ahora boolean := (to_jsonb(new) ->> v_col)::boolean;
begin
  if v_antes and not v_ahora then
    raise exception 'Una anulación no se revierte: se registra un nuevo %.', tg_table_name using errcode = 'P0001';
  end if;
  if v_ahora and not v_antes then
    if auth.uid() is not null and not app.es_admin() then
      raise exception 'Solo el administrador puede anular (rol Operador: no anula).' using errcode = 'P0001';
    end if;
    if v_origen = 'obligacion' then
      if exists (
        select 1 from public.pago p
        where p.obligacion_id = old.id and not p.anulado and not p.en_conflicto and p.deleted_at is null
      ) then
        raise exception 'OBL-06: una obligación pagada no se anula; primero debe anularse su pago.' using errcode = 'P0001';
      end if;
    elsif exists (
      select 1
      from public.movimiento m
      join public.liquidacion l on l.id = m.liquidacion_id
      where m.origen_tipo::text = v_origen and m.origen_id = old.id and l.estado in ('emitida', 'enviada')
    ) then
      raise exception 'PAG-06/COB-07: el período ya está liquidado; la corrección se registra en el período abierto.'
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

create trigger obligacion_anulacion before update on public.obligacion
  for each row execute function app.controlar_anulacion('anulada', 'obligacion');
create trigger pago_anulacion before update on public.pago
  for each row execute function app.controlar_anulacion('anulado', 'pago');
create trigger cobro_alquiler_anulacion before update on public.cobro_alquiler
  for each row execute function app.controlar_anulacion('anulado', 'cobro');

-- Contramovimientos (RN-05, MOV-06): invierten exactamente al original y no se admiten sobre
-- movimientos de un período liquidado.
create function app.controlar_movimiento() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  o public.movimiento;
begin
  if new.contramovimiento_de_id is null then
    if new.tipo = 'contramovimiento_anulacion' then
      raise exception 'Un contramovimiento debe indicar el movimiento que anula.' using errcode = 'P0001';
    end if;
    return new;
  end if;

  select * into o from public.movimiento where id = new.contramovimiento_de_id;
  if not found then
    raise exception 'El movimiento a anular no existe.' using errcode = 'P0001';
  end if;
  if o.contramovimiento_de_id is not null then
    raise exception 'No se anula un contramovimiento.' using errcode = 'P0001';
  end if;
  if new.tipo <> 'contramovimiento_anulacion' then
    raise exception 'Un movimiento que anula a otro es de tipo contramovimiento_anulacion.' using errcode = 'P0001';
  end if;
  if new.organizacion_id <> o.organizacion_id or new.propietario_id <> o.propietario_id
     or new.bien_id <> o.bien_id or new.moneda <> o.moneda
     or new.debe <> o.haber or new.haber <> o.debe then
    raise exception 'El contramovimiento debe invertir exactamente al original (mismo propietario, bien y moneda; debe y haber cruzados).'
      using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.liquidacion l where l.id = o.liquidacion_id and l.estado in ('emitida', 'enviada')
  ) then
    raise exception 'MOV-06: el movimiento pertenece a una liquidación emitida; no puede anularse.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger movimiento_contramovimiento before insert on public.movimiento
  for each row execute function app.controlar_movimiento();

-- ============================================================ numeración correlativa
-- LIQ-AAAA-NNNN, DEP-AAAA-NNNN y REC-AAAA-NNNN: por tipo y año, sin saltos ni reutilización.
-- El contador se actualiza en la misma transacción: si el alta falla, el número no se consume.
create function app.asignar_numero(p_organizacion uuid, p_tipo public.tipo_informe, p_fecha date)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_anio int := extract(year from p_fecha)::int;
  v_n int;
begin
  insert into public.numeracion (id, organizacion_id, tipo, anio, ultimo_numero)
  values (gen_random_uuid(), p_organizacion, p_tipo, v_anio, 1)
  on conflict (organizacion_id, tipo, anio)
  do update set ultimo_numero = public.numeracion.ultimo_numero + 1
  returning ultimo_numero into v_n;

  return (case p_tipo when 'liquidacion' then 'LIQ' when 'resumen_deposito' then 'DEP' else 'REC' end)
    || '-' || v_anio || '-' || lpad(v_n::text, 4, '0');
end;
$$;

-- Hoy en Argentina.
create function app.hoy() returns date
language sql stable set search_path = ''
as $$ select (pg_catalog.now() at time zone 'America/Argentina/Cordoba')::date; $$;

-- Recibo: el cliente envía un número provisorio (COB-10); al sincronizar se asigna el definitivo.
create function app.numerar_cobro() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.recibo_numero is not null and (tg_op = 'INSERT' or new.recibo_numero is distinct from old.recibo_numero) then
    new.recibo_numero := app.asignar_numero(new.organizacion_id, 'recibo', new.fecha);
  end if;
  return new;
end;
$$;

create trigger cobro_alquiler_numerar before insert or update on public.cobro_alquiler
  for each row execute function app.numerar_cobro();

-- Resumen de depósito: el número lo asigna siempre el servidor y no cambia (LIQ-08).
create function app.numerar_resumen() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.numero := app.asignar_numero(new.organizacion_id, 'resumen_deposito', new.fecha);
  elsif new.numero is distinct from old.numero then
    raise exception 'El número del resumen de depósito no se modifica.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger resumen_deposito_numerar before insert or update on public.resumen_deposito
  for each row execute function app.numerar_resumen();

-- Liquidación: el número se asigna al emitir (LIQ-01) y se conserva al reabrir (LIQ-03).
-- Estados: borrador → emitida → enviada; emitida o enviada → reabierta → emitida.
create function app.controlar_liquidacion() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_permitido boolean;
begin
  if tg_op = 'UPDATE' then
    v_permitido := case old.estado
      when 'borrador' then new.estado in ('borrador', 'emitida')
      when 'emitida' then new.estado in ('emitida', 'enviada', 'reabierta')
      when 'enviada' then new.estado in ('enviada', 'reabierta')
      when 'reabierta' then new.estado in ('reabierta', 'emitida')
    end;
    if not v_permitido then
      raise exception 'Cambio de estado no permitido: de % a %.', old.estado, new.estado using errcode = 'P0001';
    end if;

    if old.estado in ('emitida', 'enviada') and new.estado in ('emitida', 'enviada')
       and (new.propietario_id <> old.propietario_id or new.periodo_desde <> old.periodo_desde
            or new.periodo_hasta <> old.periodo_hasta) then
      raise exception 'LIQ-01: una liquidación emitida está congelada; para corregirla se reabre.' using errcode = 'P0001';
    end if;

    if new.estado = 'reabierta' and old.estado <> 'reabierta' then
      if auth.uid() is not null and not app.es_admin() then
        raise exception 'LIQ-03: solo el administrador reabre una liquidación.' using errcode = 'P0001';
      end if;
      if exists (
        select 1 from public.liquidacion l
        where l.propietario_id = old.propietario_id and l.id <> old.id and l.deleted_at is null
          and l.estado in ('emitida', 'enviada') and l.periodo_desde > old.periodo_desde
      ) then
        raise exception 'LIQ-03: solo puede reabrirse la última liquidación emitida del propietario.' using errcode = 'P0001';
      end if;
    end if;

    if old.numero is not null and old.numero not like 'PROV-%' and new.numero is distinct from old.numero then
      raise exception 'El número de una liquidación no se modifica ni se reutiliza.' using errcode = 'P0001';
    end if;
  end if;

  if new.estado in ('emitida', 'enviada') and (new.numero is null or new.numero like 'PROV-%') then
    new.fecha_emision := coalesce(new.fecha_emision, app.hoy());
    new.numero := app.asignar_numero(new.organizacion_id, 'liquidacion', new.fecha_emision);
  end if;
  if new.estado = 'emitida' and tg_op = 'UPDATE' and old.estado = 'reabierta' then
    new.fecha_emision := app.hoy();
  end if;
  return new;
end;
$$;

create trigger liquidacion_control before insert or update on public.liquidacion
  for each row execute function app.controlar_liquidacion();

-- ============================================================ usuarios y roles
-- USU-02: siempre queda al menos un administrador activo. Un usuario que no es administrador
-- solo modifica sus preferencias, no sus roles, estado, email ni vínculos.
create function app.controlar_usuario() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is not null and not app.es_admin() then
    if new.roles is distinct from old.roles or new.estado is distinct from old.estado
       or new.propietario_id is distinct from old.propietario_id
       or new.organizacion_id is distinct from old.organizacion_id
       or lower(new.email) is distinct from lower(old.email)
       or new.deleted_at is distinct from old.deleted_at then
      raise exception 'Solo el administrador modifica roles, estado, email y vínculos de un usuario.' using errcode = 'P0001';
    end if;
  end if;

  if 'administrador' = any (old.roles) and old.estado = 'activo' and old.deleted_at is null
     and not ('administrador' = any (new.roles) and new.estado = 'activo' and new.deleted_at is null)
     and not exists (
       select 1 from public.usuario u
       where u.organizacion_id = old.organizacion_id and u.id <> old.id and u.estado = 'activo'
         and u.deleted_at is null and 'administrador' = any (u.roles)
     ) then
    raise exception 'USU-02: debe existir siempre al menos un administrador activo.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger usuario_control before update on public.usuario
  for each row execute function app.controlar_usuario();

-- ============================================================ propietarios e inquilinos
-- PRO-04: al menos un teléfono y exactamente un email principal.
create function app.validar_contactos() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if jsonb_typeof(new.telefonos) <> 'array' or jsonb_array_length(new.telefonos) < 1
     or exists (select 1 from jsonb_array_elements(new.telefonos) t
                where coalesce(trim(t ->> 'numero'), '') = '') then
    raise exception 'Debe cargarse al menos un teléfono con su número.' using errcode = 'P0001';
  end if;
  if jsonb_typeof(new.emails) <> 'array'
     or exists (select 1 from jsonb_array_elements(new.emails) e
                where coalesce(trim(e ->> 'email'), '') = '')
     or (select count(*) from jsonb_array_elements(new.emails) e where (e ->> 'principal')::boolean) <> 1 then
    raise exception 'PRO-04: debe haber al menos un email y exactamente uno principal.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger propietario_contactos before insert or update on public.propietario
  for each row execute function app.validar_contactos();
create trigger inquilino_contactos before insert or update on public.inquilino
  for each row execute function app.validar_contactos();

-- PRO-05: como máximo una cuenta predeterminada por propietario y moneda.
create function app.controlar_cuenta_propietario() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.predeterminada and new.deleted_at is null and exists (
    select 1
    from public.propietario_cuenta pc
    join public.cuenta_bancaria otra on otra.id = pc.cuenta_bancaria_id
    join public.cuenta_bancaria esta on esta.id = new.cuenta_bancaria_id
    where pc.propietario_id = new.propietario_id and pc.id <> new.id and pc.predeterminada
      and pc.deleted_at is null and otra.moneda = esta.moneda
  ) then
    raise exception 'PRO-05: el propietario ya tiene una cuenta predeterminada en esa moneda.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger propietario_cuenta_control before insert or update on public.propietario_cuenta
  for each row execute function app.controlar_cuenta_propietario();

-- PRO-06: una cuenta con propietarios activos vinculados solo puede desactivarse, no darse de baja.
create function app.controlar_baja_cuenta() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.deleted_at is not null and old.deleted_at is null and exists (
    select 1
    from public.propietario_cuenta pc
    join public.propietario p on p.id = pc.propietario_id
    where pc.cuenta_bancaria_id = old.id and pc.deleted_at is null
      and p.deleted_at is null and p.estado = 'activo'
  ) then
    raise exception 'PRO-06: la cuenta tiene propietarios activos vinculados; solo puede desactivarse.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger cuenta_bancaria_baja before update on public.cuenta_bancaria
  for each row execute function app.controlar_baja_cuenta();

-- ============================================================ bienes y contratos
-- PROP-06: el Gastos varios no cambia de naturaleza, no se vende ni se da de baja mientras
-- su propietario siga activo.
create function app.controlar_bien() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if old.es_gastos_varios then
    if new.es_gastos_varios is distinct from old.es_gastos_varios or new.tipo_bien is distinct from old.tipo_bien then
      raise exception 'PROP-06: el bien Gastos varios no cambia de tipo.' using errcode = 'P0001';
    end if;
    if (new.deleted_at is distinct from old.deleted_at or new.estado is distinct from old.estado) and exists (
      select 1
      from public.bien_propietario bp
      join public.propietario p on p.id = bp.propietario_id
      where bp.bien_id = old.id and bp.deleted_at is null and p.deleted_at is null and p.estado = 'activo'
    ) then
      raise exception 'PROP-06: Gastos varios no se vende ni se da de baja; se desactiva junto con su propietario.'
        using errcode = 'P0001';
    end if;
  elsif new.es_gastos_varios then
    raise exception 'PROP-06: el bien Gastos varios lo crea el sistema junto con el propietario.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger bien_control before update on public.bien
  for each row execute function app.controlar_bien();

-- Un operador que crea un bien queda asignado a él (si no, no podría verlo).
create function app.asignar_bien_al_operador() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is not null and not app.es_admin() and app.es_operador() then
    insert into public.usuario_bien (id, organizacion_id, usuario_id, bien_id)
    values (gen_random_uuid(), new.organizacion_id, auth.uid(), new.id);
  end if;
  return new;
end;
$$;

create trigger bien_asignar_operador after insert on public.bien
  for each row execute function app.asignar_bien_al_operador();

-- CTR-06: un contrato con cobros registrados no se da de baja; solo se rescinde.
create function app.controlar_baja_contrato() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.deleted_at is not null and old.deleted_at is null and exists (
    select 1 from public.cobro_alquiler k where k.contrato_id = old.id and k.deleted_at is null
  ) then
    raise exception 'CTR-06: el contrato tiene cobros registrados; solo puede rescindirse.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger contrato_baja before update on public.contrato
  for each row execute function app.controlar_baja_contrato();

-- CAN-05: un tramo de canon aplicado a cobros ya registrados no puede modificarse; se corrige
-- con un nuevo tramo.
create function app.controlar_canon_tramo() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_siguiente date;
begin
  if old.vigente_desde is null or old.monto is null then
    return new;
  end if;
  if new.vigente_desde is distinct from old.vigente_desde or new.monto is distinct from old.monto
     or (new.deleted_at is not null and old.deleted_at is null) then
    select min(t.vigente_desde) into v_siguiente
    from public.canon_tramo t
    where t.contrato_id = old.contrato_id and t.deleted_at is null and t.id <> old.id
      and t.monto is not null and t.vigente_desde > old.vigente_desde;

    if exists (
      select 1 from public.cobro_alquiler k
      where k.contrato_id = old.contrato_id and not k.anulado and k.deleted_at is null
        and k.periodo >= old.vigente_desde and (v_siguiente is null or k.periodo < v_siguiente)
    ) then
      raise exception 'CAN-05: el tramo ya se aplicó a cobros registrados; se corrige con un nuevo tramo.' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

create trigger canon_tramo_control before update on public.canon_tramo
  for each row execute function app.controlar_canon_tramo();

-- ============================================================ control de titularidad (CON-01, CON-04)
-- No se exige en cada alta porque los titulares se cargan de a uno (también sin conexión).
-- Esta vista lista los bienes cuya titularidad está incompleta, para advertirlo en pantalla.
create view bien_titularidad_control with (security_invoker = true) as
select
  b.id as bien_id,
  b.organizacion_id,
  coalesce(sum(bp.porcentaje), 0) as suma_porcentajes,
  count(*) filter (where bp.es_representante) as representantes,
  (coalesce(sum(bp.porcentaje), 0) <> 100) as porcentajes_incorrectos,
  (b.modo_liquidacion = 'al_representante'
     and count(*) filter (where bp.es_representante) <> 1) as representante_incorrecto
from public.bien b
left join public.bien_propietario bp on bp.bien_id = b.id and bp.deleted_at is null
where b.deleted_at is null
group by b.id, b.organizacion_id, b.modo_liquidacion;
