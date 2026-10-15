-- Ingreso · Configuración inicial (P-06): crea la administración, su primer administrador y el
-- catálogo inicial de conceptos en una sola operación (o se hace todo o no se hace nada).
-- Se ejecuta DESPUÉS de bloque3_6_almacenamiento.sql.
--
-- Solo la puede llamar el servidor (clave de servicio), desde la función `configuracion-inicial`:
-- ningún usuario de la aplicación ni el rol anónimo tienen permiso. La función rechaza la
-- llamada si ya existe una administración (ADM-01: una sola, no hay multiempresa).

create function public.configuracion_inicial(
  p_organizacion_id uuid,
  p_usuario_id uuid,
  p_nombre_usuario text,
  p_email text,
  p_organizacion jsonb
) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  -- Dos llamadas simultáneas no pueden crear dos administraciones.
  perform pg_advisory_xact_lock(hashtext('configuracion_inicial'));

  if exists (select 1 from public.organizacion where deleted_at is null) then
    raise exception 'ADM-01: la administración ya está configurada.' using errcode = 'P0001';
  end if;

  insert into public.organizacion
    (id, nombre, cuit, contacto_telefono, contacto_email, contacto_direccion)
  values (
    p_organizacion_id,
    p_organizacion ->> 'nombre',
    nullif(p_organizacion ->> 'cuit', ''),
    nullif(p_organizacion ->> 'contactoTelefono', ''),
    nullif(p_organizacion ->> 'contactoEmail', ''),
    nullif(p_organizacion ->> 'contactoDireccion', '')
  );

  insert into public.usuario (id, organizacion_id, nombre, email, roles, estado)
  values (p_usuario_id, p_organizacion_id, p_nombre_usuario, lower(p_email),
          array['administrador']::public.rol[], 'activo');

  -- Catálogo inicial de conceptos (sección 4.1 del diccionario de datos).
  insert into public.concepto (id, organizacion_id, nombre, categoria)
  select gen_random_uuid(), p_organizacion_id, c.nombre, c.categoria::public.categoria_concepto
  from (values
    ('Luz', 'servicio'),
    ('Agua', 'servicio'),
    ('Gas', 'servicio'),
    ('Expensas', 'expensa'),
    ('Municipalidad', 'tasa'),
    ('Rentas', 'impuesto'),
    ('Internet/Televisión', 'servicio'),
    ('Seguro', 'seguro'),
    ('Verificación/VTV', 'tasa'),
    ('Mantenimiento', 'otro'),
    ('Pileta/jardín', 'otro'),
    ('Otro', 'otro')
  ) as c (nombre, categoria);
end;
$$;

revoke all on function public.configuracion_inicial(uuid, uuid, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.configuracion_inicial(uuid, uuid, text, text, jsonb) to service_role;
