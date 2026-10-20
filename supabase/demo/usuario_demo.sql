-- USUARIO DE PRUEBA (solo para desarrollo). Contraseña débil a propósito: 123456.
--
-- Si la cuenta demo@example.com no existe, este script la crea directamente en el esquema de autenticación
-- (igual que usuario_propietario_demo.sql). Contraseña: 123456.
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
    v_auth := gen_random_uuid();
    insert into auth.users
      (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
       created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
    values
      ('00000000-0000-0000-0000-000000000000', v_auth, 'authenticated', 'authenticated', 'demo@example.com',
       crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
    insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), v_auth, jsonb_build_object('sub', v_auth::text, 'email', 'demo@example.com', 'email_verified', true),
            'email', v_auth::text, now(), now(), now());
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
