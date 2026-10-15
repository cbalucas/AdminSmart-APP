-- USUARIO DE PRUEBA (solo para desarrollo). Contraseña débil a propósito: 123456.
--
-- ANTES de ejecutar este script hay que crear la cuenta de acceso en Supabase:
--   Authentication → Users → Add user → Create new user
--     Email: demo@example.com   Password: 123456   ✔ Auto Confirm User
--
-- Este script vincula esa cuenta con la administración como administrador, con el nombre de
-- usuario "demo". Se puede ejecutar más de una vez.
--
-- ⚠ ANTES DE CARGAR DATOS REALES, borrar esta cuenta:
--   1) En este editor:   update public.usuario set estado = 'inactivo' where nombre_usuario = 'demo';
--   2) En Authentication → Users: eliminar demo@example.com

do $$
declare
  v_auth uuid;
  v_org uuid;
begin
  select id into v_auth from auth.users where lower(email) = 'demo@example.com';
  if v_auth is null then
    raise exception 'Primero creá la cuenta demo@example.com en Authentication → Users (ver las instrucciones al comienzo de este archivo).';
  end if;

  select id into v_org from public.organizacion where deleted_at is null limit 1;
  if v_org is null then
    raise exception 'Todavía no se hizo la configuración inicial de la administración.';
  end if;

  insert into public.usuario (id, organizacion_id, nombre, email, nombre_usuario, roles, estado)
  values (v_auth, v_org, 'Usuario Demo', 'demo@example.com', 'demo', array['administrador']::public.rol[], 'activo')
  on conflict (id) do update
    set nombre = excluded.nombre,
        nombre_usuario = excluded.nombre_usuario,
        roles = excluded.roles,
        estado = 'activo',
        deleted_at = null;
end;
$$;
