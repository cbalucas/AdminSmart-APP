-- Paso 7 · Pagos y anulaciones (PAG-01 a PAG-06, RN-05, RN-13, MOV-02).
-- Cada operación se ejecuta en una sola transacción: el pago, el ajuste del monto y los movimientos
-- de la cuenta corriente se guardan juntos o no se guarda nada. Las funciones corren con los permisos
-- de quien las llama (security invoker): rigen las políticas RLS y las protecciones del bloque 3
-- (solo el administrador anula, no se anula un período liquidado).
--
-- Los débitos por propietario los calcula la aplicación (packages/domain, debitosDelPago) y llegan en
-- `p_debitos`: [{"propietario_id": "...", "debe": 12345}]. La base solo verifica que correspondan a
-- titulares del bien y que no superen el importe pagado.

drop function if exists public.registrar_pago(uuid, date, bigint, public.pagado_por, public.medio_pago, text, text, jsonb);
drop function if exists public.registrar_pago_directo(uuid, uuid, uuid, public.responsable, text, public.moneda, date, bigint, public.pagado_por, public.medio_pago, text, text, jsonb);

create or replace function public.registrar_pago(
  p_obligacion uuid,
  p_fecha date,
  p_importe bigint,
  p_pagado_por public.pagado_por,
  p_medio public.medio_pago,
  p_nro_operacion text,
  p_observaciones text,
  p_debitos jsonb,
  p_pago_id uuid default null
) returns jsonb
language plpgsql security invoker set search_path = ''
as $$
declare
  o public.obligacion;
  v_pago uuid := coalesce(p_pago_id, app.uuid_v7());
  v_bien text;
  v_concepto text;
  v_suma bigint := 0;
  d jsonb;
begin
  select * into o from public.obligacion where id = p_obligacion and deleted_at is null for update;
  if not found then
    raise exception 'La obligación no existe.' using errcode = 'P0001';
  end if;
  if o.anulada then
    raise exception 'No se registra el pago de una obligación anulada.' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.pago p
    where p.obligacion_id = o.id and not p.anulado and not p.en_conflicto and p.deleted_at is null
  ) then
    raise exception 'PAG-01: la obligación ya tiene un pago registrado.' using errcode = 'P0001';
  end if;

  -- PAG-01, OBL-11: la obligación toma el importe pagado como monto final.
  if o.monto is distinct from p_importe then
    update public.obligacion set monto = p_importe where id = o.id;
  end if;

  insert into public.pago (id, organizacion_id, obligacion_id, fecha, importe, pagado_por, medio, nro_operacion, observaciones)
  values (v_pago, o.organizacion_id, o.id, p_fecha, p_importe, p_pagado_por, p_medio, p_nro_operacion, p_observaciones);

  select b.alias into v_bien from public.bien b where b.id = o.bien_id;
  select c.nombre into v_concepto from public.concepto c where c.id = o.concepto_id;

  for d in select * from jsonb_array_elements(coalesce(p_debitos, '[]'::jsonb)) loop
    if not exists (
      select 1 from public.bien_propietario bp
      where bp.bien_id = o.bien_id and bp.propietario_id = (d ->> 'propietario_id')::uuid and bp.deleted_at is null
    ) then
      raise exception 'El débito corresponde a alguien que no es titular del bien.' using errcode = 'P0001';
    end if;
    v_suma := v_suma + (d ->> 'debe')::bigint;
    insert into public.movimiento
      (id, organizacion_id, propietario_id, bien_id, moneda, fecha, tipo, debe, haber, descripcion, origen_tipo, origen_id)
    values
      (app.uuid_v7(), o.organizacion_id, (d ->> 'propietario_id')::uuid, o.bien_id, o.moneda, p_fecha,
       'pago_obligacion', (d ->> 'debe')::bigint, 0,
       v_concepto || ' ' || to_char(o.periodo, 'MM/YYYY') || ' · ' || v_bien, 'pago', v_pago);
  end loop;
  if v_suma > p_importe then
    raise exception 'Los débitos superan el importe pagado.' using errcode = 'P0001';
  end if;

  return jsonb_build_object('pago_id', v_pago, 'obligacion_id', o.id);
end;
$$;

-- PAG-02: pago sin obligación previa. Se crea la obligación ya pagada para que el historial quede completo.
create or replace function public.registrar_pago_directo(
  p_organizacion uuid,
  p_bien uuid,
  p_concepto uuid,
  p_responsable public.responsable,
  p_descripcion text,
  p_moneda public.moneda,
  p_fecha date,
  p_importe bigint,
  p_pagado_por public.pagado_por,
  p_medio public.medio_pago,
  p_nro_operacion text,
  p_observaciones text,
  p_debitos jsonb,
  p_pago_id uuid default null
) returns jsonb
language plpgsql security invoker set search_path = ''
as $$
declare
  v_obligacion uuid := app.uuid_v7();
begin
  insert into public.obligacion
    (id, organizacion_id, bien_id, concepto_id, periodo, es_recurrente, monto, moneda, responsable, descripcion)
  values
    (v_obligacion, p_organizacion, p_bien, p_concepto, date_trunc('month', p_fecha)::date, false,
     p_importe, p_moneda, p_responsable, p_descripcion);
  return public.registrar_pago(v_obligacion, p_fecha, p_importe, p_pagado_por, p_medio, p_nro_operacion, p_observaciones, p_debitos, p_pago_id);
end;
$$;

-- PAG-05: el pago no se borra; se anula con motivo y se generan los contramovimientos de sus movimientos.
-- La obligación vuelve a Pendiente o Vencida porque su pago ya no cuenta (vista obligacion_estado).
create or replace function public.anular_pago(p_pago uuid, p_motivo text) returns void
language plpgsql security invoker set search_path = ''
as $$
begin
  if p_motivo is null or length(trim(p_motivo)) = 0 then
    raise exception 'PAG-05: el motivo de la anulación es obligatorio.' using errcode = 'P0001';
  end if;

  -- Las protecciones (solo administrador, período no liquidado) las aplica el trigger pago_anulacion.
  update public.pago
     set anulado = true, anulacion_motivo = trim(p_motivo), anulacion_fecha = now(), anulacion_usuario_id = auth.uid()
   where id = p_pago and not anulado and deleted_at is null;
  if not found then
    raise exception 'El pago no existe o ya está anulado.' using errcode = 'P0001';
  end if;

  insert into public.movimiento
    (id, organizacion_id, propietario_id, bien_id, moneda, fecha, tipo, debe, haber, descripcion, origen_tipo, origen_id, contramovimiento_de_id)
  select app.uuid_v7(), m.organizacion_id, m.propietario_id, m.bien_id, m.moneda,
         (now() at time zone 'America/Argentina/Cordoba')::date,
         'contramovimiento_anulacion', m.haber, m.debe, 'Anulación: ' || m.descripcion, m.origen_tipo, m.origen_id, m.id
    from public.movimiento m
   where m.origen_tipo = 'pago' and m.origen_id = p_pago and m.contramovimiento_de_id is null
     and not exists (select 1 from public.movimiento x where x.contramovimiento_de_id = m.id);
end;
$$;

grant execute on function public.registrar_pago(uuid, date, bigint, public.pagado_por, public.medio_pago, text, text, jsonb, uuid) to authenticated;
grant execute on function public.registrar_pago_directo(uuid, uuid, uuid, public.responsable, text, public.moneda, date, bigint, public.pagado_por, public.medio_pago, text, text, jsonb, uuid) to authenticated;
grant execute on function public.anular_pago(uuid, text) to authenticated;
