-- Cierre de la Fase 1 · Seguridad (SEG-02): ninguna función de la aplicación se puede ejecutar sin haber iniciado sesión.
-- Por defecto PostgreSQL deja ejecutar toda función nueva a cualquiera (PUBLIC) y Supabase se la da además al rol
-- anónimo. Ninguna de estas funciones debe poder llamarse sin sesión: los asistentes de las políticas (esquema app) y
-- las operaciones de pago, traspaso y resumen (esquema public) las usa solo quien ingresó, y la configuración inicial
-- ya estaba reservada al servidor. Los roles `authenticated` y `service_role` conservan el permiso.

revoke execute on all functions in schema public from public, anon;
revoke execute on all functions in schema app from public, anon;
grant execute on all functions in schema public to authenticated, service_role;
grant execute on all functions in schema app to authenticated, service_role;

-- Lo mismo para las funciones que se creen más adelante.
alter default privileges in schema public revoke execute on functions from public, anon;
alter default privileges in schema app revoke execute on functions from public, anon;
alter default privileges in schema public grant execute on functions to authenticated, service_role;
alter default privileges in schema app grant execute on functions to authenticated, service_role;

-- La configuración inicial sigue siendo exclusiva del servidor.
revoke execute on function public.configuracion_inicial(uuid, uuid, text, text, jsonb) from authenticated;
