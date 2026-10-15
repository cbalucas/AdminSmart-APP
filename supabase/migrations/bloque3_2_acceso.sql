-- Bloque 3 · Vínculo con Supabase Auth y funciones de acceso (quién ve y opera qué).
-- Se ejecuta DESPUÉS de bloque3_1_control.sql.
--
-- Las funciones viven en el esquema `app`, que la API de Supabase no expone. Son
-- SECURITY DEFINER con ruta de búsqueda fija para consultar `usuario` sin que las
-- propias políticas se llamen en bucle.
--
-- Alcance (sección 2 de la especificación y USU-04):
--   Administrador: todo lo de su organización.
--   Operador:      sus bienes asignados y el Gastos varios de los propietarios de esos bienes.
--   Propietario:   solo los bienes donde figura como titular (solo lectura).
-- Los permisos de varios roles se suman (USU-06).

create schema if not exists app;
revoke all on schema app from public;
grant usage on schema app to authenticated, service_role;
alter default privileges in schema app revoke execute on functions from public;
alter default privileges in schema app grant execute on functions to authenticated, service_role;

-- El `id` del usuario es el de Supabase Auth. Sin borrado en cascada: la baja es lógica (USU-07).
alter table public.usuario
  add constraint usuario_auth_fk foreign key (id) references auth.users (id) on delete restrict;

-- Organización y roles del usuario conectado (solo si está activo).
create function app.mi_organizacion() returns uuid
language sql stable security definer set search_path = ''
as $$
  select u.organizacion_id from public.usuario u
  where u.id = auth.uid() and u.estado = 'activo' and u.deleted_at is null;
$$;

create function app.tiene_rol(p_rol public.rol) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.usuario u
    where u.id = auth.uid() and u.estado = 'activo' and u.deleted_at is null and p_rol = any (u.roles)
  );
$$;

create function app.es_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select app.tiene_rol('administrador'); $$;

create function app.es_operador() returns boolean
language sql stable security definer set search_path = ''
as $$ select app.tiene_rol('operador'); $$;

create function app.es_propietario() returns boolean
language sql stable security definer set search_path = ''
as $$ select app.tiene_rol('propietario'); $$;

create function app.mi_propietario() returns uuid
language sql stable security definer set search_path = ''
as $$
  select u.propietario_id from public.usuario u
  where u.id = auth.uid() and u.estado = 'activo' and u.deleted_at is null and 'propietario' = any (u.roles);
$$;

-- Bienes del operador: los asignados más el Gastos varios de los propietarios de esos bienes.
create function app.bienes_operador() returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select ub.bien_id
  from public.usuario_bien ub
  where app.es_operador() and ub.usuario_id = auth.uid() and ub.deleted_at is null
  union
  select gv.id
  from public.bien gv
  join public.bien_propietario gbp on gbp.bien_id = gv.id and gbp.deleted_at is null
  where app.es_operador() and gv.es_gastos_varios and gv.deleted_at is null
    and gbp.propietario_id in (
      select bp.propietario_id
      from public.bien_propietario bp
      join public.usuario_bien ub on ub.bien_id = bp.bien_id
      where bp.deleted_at is null and ub.deleted_at is null and ub.usuario_id = auth.uid()
    );
$$;

-- Bienes del propietario: aquellos donde figura como titular.
create function app.bienes_propietario() returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select bp.bien_id
  from public.bien_propietario bp
  where app.es_propietario() and bp.propietario_id = app.mi_propietario() and bp.deleted_at is null;
$$;

-- Propietarios que el operador puede ver: los titulares de sus bienes.
create function app.propietarios_operador() returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select bp.propietario_id
  from public.bien_propietario bp
  where app.es_operador() and bp.deleted_at is null and bp.bien_id in (select app.bienes_operador());
$$;

create function app.ve_bien_como_operador(p_bien uuid) returns boolean
language sql stable security definer set search_path = ''
as $$ select p_bien in (select app.bienes_operador()); $$;

create function app.ve_bien_como_propietario(p_bien uuid) returns boolean
language sql stable security definer set search_path = ''
as $$ select p_bien in (select app.bienes_propietario()); $$;

create function app.puede_ver_bien(p_bien uuid) returns boolean
language sql stable security definer set search_path = ''
as $$ select app.es_admin() or app.ve_bien_como_operador(p_bien) or app.ve_bien_como_propietario(p_bien); $$;

-- Quién puede cargar y modificar sobre un bien: administrador y operador (no el propietario).
create function app.puede_operar_bien(p_bien uuid) returns boolean
language sql stable security definer set search_path = ''
as $$ select app.es_admin() or app.ve_bien_como_operador(p_bien); $$;

-- Un propietario recién cargado todavía no tiene bienes: lo ve y completa cualquier operador
-- hasta que se le vincule su primer bien.
create function app.propietario_sin_bienes(p_propietario uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select not exists (
    select 1 from public.bien_propietario bp where bp.propietario_id = p_propietario and bp.deleted_at is null
  );
$$;

create function app.puede_ver_propietario(p_propietario uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select app.es_admin()
    or p_propietario in (select app.propietarios_operador())
    or (app.es_operador() and app.propietario_sin_bienes(p_propietario))
    or p_propietario = app.mi_propietario();
$$;

create function app.puede_operar_propietario(p_propietario uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select app.es_admin()
    or p_propietario in (select app.propietarios_operador())
    or (app.es_operador() and app.propietario_sin_bienes(p_propietario));
$$;

-- Un bien recién creado no tiene titulares: el operador puede cargar el primero (100 %).
-- Cambiar los titulares y el reparto después es exclusivo del administrador (P-18).
create function app.bien_sin_titulares(p_bien uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select not exists (select 1 from public.bien_propietario bp where bp.bien_id = p_bien and bp.deleted_at is null);
$$;

-- El propietario ve las cuentas bancarias que tiene vinculadas.
create function app.cuenta_del_propietario(p_cuenta uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.propietario_cuenta pc
    where pc.cuenta_bancaria_id = p_cuenta and pc.deleted_at is null and pc.propietario_id = app.mi_propietario()
  );
$$;

create function app.bien_de_reparto(p_reparto uuid) returns uuid
language sql stable security definer set search_path = ''
as $$ select r.bien_id from public.reparto_concepto r where r.id = p_reparto; $$;

create function app.propietario_de_resumen(p_resumen uuid) returns uuid
language sql stable security definer set search_path = ''
as $$ select r.propietario_id from public.resumen_deposito r where r.id = p_resumen; $$;

-- El propietario ve sus liquidaciones solo una vez emitidas (no los borradores).
create function app.puede_ver_liquidacion(p_liquidacion uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select app.es_admin() or exists (
    select 1 from public.liquidacion l
    where l.id = p_liquidacion and l.estado in ('emitida', 'enviada') and l.propietario_id = app.mi_propietario()
  );
$$;

-- Inquilino: el operador ve los de contratos de sus bienes y los que aún no tienen contrato
-- (recién cargados); el propietario ve los de contratos de sus bienes.
create function app.puede_ver_inquilino(p_inquilino uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select app.es_admin()
    or (app.es_operador() and (
          exists (select 1 from public.contrato c
                  where c.inquilino_id = p_inquilino and c.deleted_at is null
                    and c.bien_id in (select app.bienes_operador()))
          or not exists (select 1 from public.contrato c
                         where c.inquilino_id = p_inquilino and c.deleted_at is null)))
    or (app.es_propietario() and exists (
          select 1 from public.contrato c
          where c.inquilino_id = p_inquilino and c.deleted_at is null
            and c.bien_id in (select app.bienes_propietario())));
$$;

create function app.puede_operar_inquilino(p_inquilino uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select app.es_admin()
    or (app.es_operador() and (
          exists (select 1 from public.contrato c
                  where c.inquilino_id = p_inquilino and c.deleted_at is null
                    and c.bien_id in (select app.bienes_operador()))
          or not exists (select 1 from public.contrato c
                         where c.inquilino_id = p_inquilino and c.deleted_at is null)));
$$;

-- Bien al que pertenece cada objeto (consulta sin pasar por RLS).
create function app.bien_de_contrato(p_contrato uuid) returns uuid
language sql stable security definer set search_path = ''
as $$ select c.bien_id from public.contrato c where c.id = p_contrato; $$;

create function app.bien_de_obligacion(p_obligacion uuid) returns uuid
language sql stable security definer set search_path = ''
as $$ select o.bien_id from public.obligacion o where o.id = p_obligacion; $$;

-- El propietario ve solo las obligaciones a su cargo (P-26: "las suyas").
create function app.obligacion_a_cargo_del_propietario(p_obligacion uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.obligacion o
    where o.id = p_obligacion and o.responsable = 'propietario' and app.ve_bien_como_propietario(o.bien_id)
  );
$$;

-- Documentos: el operador ve los de los objetos que ve; el propietario, solo los marcados
-- como visibles (DOC-02); el administrador, todos.
create function app.puede_ver_documento(p_entidad public.entidad_documento, p_entidad_id uuid, p_visible boolean)
returns boolean
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_bien uuid;
  v_propietario uuid;
  v_operador boolean;
  v_dueno boolean;
begin
  if app.es_admin() then return true; end if;

  case p_entidad
    when 'bien' then v_bien := p_entidad_id;
    when 'contrato' then v_bien := app.bien_de_contrato(p_entidad_id);
    when 'obligacion' then v_bien := app.bien_de_obligacion(p_entidad_id);
    when 'pago' then
      select o.bien_id into v_bien from public.pago p join public.obligacion o on o.id = p.obligacion_id where p.id = p_entidad_id;
    when 'cobro_alquiler' then
      select c.bien_id into v_bien from public.cobro_alquiler k join public.contrato c on c.id = k.contrato_id where k.id = p_entidad_id;
    when 'movimiento' then
      select m.bien_id into v_bien from public.movimiento m where m.id = p_entidad_id;
    when 'propietario' then v_propietario := p_entidad_id;
    when 'liquidacion' then
      select l.propietario_id into v_propietario from public.liquidacion l
      where l.id = p_entidad_id and l.estado in ('emitida', 'enviada');
    else null;
  end case;

  if v_bien is not null then
    v_operador := app.ve_bien_como_operador(v_bien);
    v_dueno := app.ve_bien_como_propietario(v_bien);
  elsif v_propietario is not null then
    v_operador := p_entidad <> 'liquidacion' and v_propietario in (select app.propietarios_operador());
    v_dueno := v_propietario = app.mi_propietario();
  elsif p_entidad = 'inquilino' then
    v_operador := app.puede_ver_inquilino(p_entidad_id) and app.es_operador();
    v_dueno := app.es_propietario() and app.puede_ver_inquilino(p_entidad_id);
  end if;

  return coalesce(v_operador, false) or (coalesce(p_visible, false) and coalesce(v_dueno, false));
end;
$$;

create function app.puede_operar_documento(p_entidad public.entidad_documento, p_entidad_id uuid)
returns boolean
language plpgsql stable security definer set search_path = ''
as $$
begin
  if app.es_admin() then return true; end if;
  if not app.es_operador() then return false; end if;
  -- El operador carga documentos sobre lo que ve como operador (p_visible = false anula la vía del propietario).
  return app.puede_ver_documento(p_entidad, p_entidad_id, false);
end;
$$;
