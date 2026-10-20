-- USUARIO PROPIETARIO DE PRUEBA (solo para desarrollo). Contraseña débil a propósito: 123456.
--
-- Crea la cuenta de acceso propietario.demo@example.com directamente en el esquema de autenticación (la
-- pantalla de invitaciones llega más adelante) y la vincula con la ficha del propietario "Carlos José Paez Allende"
-- como usuario con rol Propietario, con el nombre de usuario "propietario.demo". Se puede ejecutar más de una vez.
--
-- ⚠ ANTES DE CARGAR DATOS REALES, borrar esta cuenta:
--   1) update public.usuario set estado = 'inactivo' where nombre_usuario = 'propietario.demo';
--   2) En Authentication → Users: eliminar propietario.demo@example.com

do $$
declare
  v_auth uuid;
  v_org uuid;
  v_prop uuid;
begin
  select id into v_org from public.organizacion where deleted_at is null limit 1;
  select id into v_prop from public.propietario where nombre_razon_social like 'Carlos José%' and deleted_at is null limit 1;
  if v_org is null or v_prop is null then
    raise exception 'Falta la administración o el propietario Carlos José Paez Allende.';
  end if;

  select id into v_auth from auth.users where lower(email) = 'propietario.demo@example.com';
  if v_auth is null then
    v_auth := gen_random_uuid();
    insert into auth.users
      (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
       created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
    values
      ('00000000-0000-0000-0000-000000000000', v_auth, 'authenticated', 'authenticated', 'propietario.demo@example.com',
       crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
    insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), v_auth, jsonb_build_object('sub', v_auth::text, 'email', 'propietario.demo@example.com', 'email_verified', true),
            'email', v_auth::text, now(), now(), now());
  end if;

  insert into public.usuario (id, organizacion_id, nombre, email, nombre_usuario, roles, propietario_id, estado)
  values (v_auth, v_org, 'Carlos José Paez Allende', 'propietario.demo@example.com', 'propietario.demo', array['propietario']::public.rol[], v_prop, 'activo')
  on conflict (id) do update
    set roles = excluded.roles, propietario_id = excluded.propietario_id, estado = 'activo', deleted_at = null;
end;
$$;
