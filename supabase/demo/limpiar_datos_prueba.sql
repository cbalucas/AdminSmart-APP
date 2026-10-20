-- LIMPIEZA DE LOS DATOS DE PRUEBA — para ejecutar UNA SOLA VEZ, antes de cargar datos reales.
--
-- ⚠ BORRA, sin vuelta atrás: propietarios, bienes y su titularidad, servicios, obligaciones, pagos, movimientos de las
--   cuentas corrientes, resúmenes de depósito y su historial de envíos, documentos, edificios, cuentas bancarias,
--   inquilinos y contratos (si los hubiera), el registro de auditoría y los contadores de numeración (el primer
--   resumen real vuelve a ser DEP-AAAA-0001), y las tres cuentas de prueba (demo, propietario.demo y operador.demo).
--
-- ✔ CONSERVA: la administración y sus datos (nombre, logo, cuenta de depósito, preferencias), el catálogo de conceptos,
--   las plantillas de envío que hayas editado y los usuarios que no son de prueba (por ejemplo tu cuenta real).
--
-- Los archivos subidos (boletas, comprobantes, PDF, avatares) no se pueden borrar desde acá: quedan en el almacenamiento.
-- Para vaciarlo, en Supabase: Storage → cada almacenamiento (documentos, avatares, informes) → seleccionar todo → Delete.
--
-- Cómo usarlo: pegarlo en SQL Editor de Supabase y ejecutarlo. Termina con un resumen de lo que quedó; si algo no
-- coincide con lo esperado, cambiar COMMIT por ROLLBACK en la última línea y se deshace todo.

begin;

-- Sin disparadores: así se pueden borrar los registros que normalmente son de solo inserción y no se llena la auditoría.
set local session_replication_role = replica;

delete from public.envio;
delete from public.resumen_deposito_monto;
delete from public.resumen_deposito;
delete from public.documento;
delete from public.movimiento;
delete from public.pago;
delete from public.obligacion;
delete from public.cobro_alquiler;
delete from public.liquidacion_total;
delete from public.liquidacion;
delete from public.canon_tramo;
delete from public.contrato_responsabilidad;
delete from public.reparto_concepto_porcentaje;
delete from public.reparto_concepto;
delete from public.contrato;
delete from public.inquilino;
delete from public.acuerdo_honorarios;
delete from public.bien_servicio;
delete from public.usuario_bien;
delete from public.bien_propietario;
delete from public.propietario_cuenta;
delete from public.cuenta_bancaria;
delete from public.bien;
delete from public.edificio;
delete from public.propietario;
delete from public.numeracion;
delete from public.auditoria;

-- Cuentas de prueba (las asignaciones de bienes y los vínculos ya se borraron arriba).
delete from public.usuario where lower(email) in ('demo@example.com', 'propietario.demo@example.com', 'operador.demo@example.com');
delete from auth.identities where user_id in (select id from auth.users where lower(email) in ('demo@example.com', 'propietario.demo@example.com', 'operador.demo@example.com'));
delete from auth.users where lower(email) in ('demo@example.com', 'propietario.demo@example.com', 'operador.demo@example.com');

-- Resumen de lo que quedó.
select
  (select nombre from public.organizacion limit 1) as administracion,
  (select count(*) from public.concepto) as conceptos,
  (select count(*) from public.usuario) as usuarios,
  (select string_agg(email, ', ') from public.usuario) as quienes,
  (select count(*) from public.propietario) as propietarios,
  (select count(*) from public.bien) as bienes,
  (select count(*) from public.obligacion) as obligaciones,
  (select count(*) from public.movimiento) as movimientos;

commit;
