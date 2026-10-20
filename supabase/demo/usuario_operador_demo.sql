-- USUARIO OPERADOR DE PRUEBA (solo para desarrollo). Contraseña débil a propósito: 123456.
--
-- Crea la cuenta operador.demo@example.com y la asigna como Operador a dos bienes: "Dpto Caseros" y "AI539LO".
-- No tiene asignados "Terreno Berrotaran" ni "AE896SR": sirve para comprobar que el operador ve y opera solo
-- lo suyo (USU-04). Se ejecuta DESPUÉS de datos_prueba_bienes.sql. Se puede ejecutar más de una vez.
--
-- ⚠ ANTES DE CARGAR DATOS REALES, borrar esta cuenta (o ejecutar limpiar_datos_prueba.sql).

do $$
declare
  v_auth uuid;
  v_org uuid;
  v_bien uuid;
  v_alias text;
begin
  select id into v_org from public.organizacion where deleted_at is null limit 1;
  if v_org is null then raise exception 'Falta la administración.'; end if;

  select id into v_auth from auth.users where lower(email) = 'operador.demo@example.com';
  if v_auth is null then
    v_auth := gen_random_uuid();
    insert into auth.users
      (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
       created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
    values
      ('00000000-0000-0000-0000-000000000000', v_auth, 'authenticated', 'authenticated', 'operador.demo@example.com',
       crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
    insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), v_auth, jsonb_build_object('sub', v_auth::text, 'email', 'operador.demo@example.com', 'email_verified', true),
            'email', v_auth::text, now(), now(), now());
  end if;

  insert into public.usuario (id, organizacion_id, nombre, email, nombre_usuario, roles, estado)
  values (v_auth, v_org, 'Operador Demo', 'operador.demo@example.com', 'operador.demo', array['operador']::public.rol[], 'activo')
  on conflict (id) do update set roles = excluded.roles, estado = 'activo', deleted_at = null;

  foreach v_alias in array array['Dpto Caseros', 'AI539LO'] loop
    select id into v_bien from public.bien where alias = v_alias and deleted_at is null;
    if v_bien is not null and not exists (select 1 from public.usuario_bien where usuario_id = v_auth and bien_id = v_bien and deleted_at is null) then
      insert into public.usuario_bien (id, organizacion_id, usuario_id, bien_id) values (app.uuid_v7(), v_org, v_auth, v_bien);
    end if;
  end loop;
end;
$$;
