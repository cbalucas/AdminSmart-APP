# Antes de cargar datos reales

Lista de control para pasar de los datos de prueba a los datos reales de la administración.

## 1. Limpiar lo de prueba

1. Abrí Supabase, entrá al proyecto `adminsmart` y abrí **SQL Editor**.
2. Pegá el contenido de `supabase/demo/limpiar_datos_prueba.sql` y ejecutalo. Borra propietarios, bienes, servicios, obligaciones, pagos, movimientos, resúmenes, auditoría y las tres cuentas de prueba (`demo`, `propietario.demo` y `operador.demo`). Conserva la administración, el catálogo de conceptos, las plantillas que hayas editado y tu usuario real.
3. Al final muestra un resumen de lo que quedó. Si algo no coincide, cambiá `commit` por `rollback` en la última línea y se deshace todo.
4. En **Storage** vaciá los almacenamientos `documentos`, `avatares` e `informes` (seleccionar todo y **Delete**): los archivos de prueba no se borran con la limpieza.

## 2. Cargar la administración

- En **Configuración**, **Datos de la administración**: nombre, CUIT, contacto, logo (mejor PNG o JPG, porque el SVG no sale en los PDF) y la cuenta donde depositan los propietarios.
- En **Preferencias generales**: días de aviso de los gastos recurrentes y moneda por defecto.
- En **Plantillas de envío**: revisá los textos de WhatsApp (y de email, para cuando se conecte).

## 3. Cargar los datos del negocio, en este orden

1. Propietarios (cada uno crea solo su bien "Gastos varios").
2. Cuentas bancarias de los propietarios.
3. Bienes con sus titulares y su forma de liquidación.
4. Servicios e impuestos de cada bien, y las obligaciones.

## 4. Usuarios

- Las cuentas de prueba ya no existen. Tu usuario administrador sigue funcionando.
- Alta de operadores y de propietarios con acceso: llega con las invitaciones de usuarios (pantalla P-41), que todavía no está construida.

## 5. Respaldo y seguridad

- Supabase hace respaldos diarios automáticos (SEG-06). Conviene verificar en el panel de Supabase que estén activos.
- No compartas nunca la clave `secret` ni `service_role` del proyecto. La clave `publishable` sí es pública.

## Pendiente fuera de la Fase 1

- Mapa interactivo de ubicación de los bienes (falta la clave de Google Maps).
- Envío de resúmenes por email (versión con validación de Gmail y autorización de envío).
- Sincronización sin conexión (PowerSync).
- Invitaciones de usuarios, doble factor y recuperación por SMS.
- Cifrado del CBU en reposo (SEG-04) y depuración de la auditoría a los 5 años (AUD-03).
- Alquileres, inquilinos y contratos (Fase 2) y liquidaciones (Fase 3).
