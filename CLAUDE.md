# Administración Inteligente — instrucciones para Claude Code

## Qué es este proyecto

Aplicación web y móvil para una administración de bienes en Córdoba, Argentina. Administra bienes (inmuebles, terrenos, vehículos y otros) de uno o varios propietarios, controla impuestos, servicios y alquileres, y le informa a cada propietario cuánto debe depositar. La definición funcional, contable y técnica está cerrada (versión 1.0 del 14/10/2026) y vive en `docs/especificacion/`.

El usuario (dueño del proyecto) no es programador. Es experto en administración de propiedades y en contabilidad. Por eso:

- Hablale siempre en español, con lenguaje profesional y claro, sin jerga innecesaria.
- Cuando necesites que él haga algo (crear una cuenta, copiar una clave, instalar algo, probar en el teléfono), dale los pasos exactos, uno por uno.
- Antes de un cambio grande, explicá el plan en pocas líneas y esperá su conformidad.
- Al terminar cada tarea, decí qué quedó hecho, cómo probarlo y cuál es el próximo paso.

## Documentación (leer antes de programar)

| Archivo | Contenido |
| --- | --- |
| `docs/especificacion/01-especificacion.md` | Requerimientos (RF), reglas de negocio y contables (RN), arquitectura, seguridad (SEG), fases y decisiones |
| `docs/especificacion/02-diccionario-de-datos.md` | Los 20 objetos con cada campo, tipo, obligatoriedad y reglas (PRO-, PROP-, OBL-, PAG-, COB-, MOV-, LIQ-, etc.) |
| `docs/especificacion/03-mapa-de-pantallas.md` | Las 49 pantallas (P-01 a P-49), sistema visual (sección 12) e idiomas (sección 13) |
| `docs/especificacion/04-flujos-y-escenarios.md` | 79 escenarios normales, alternativos y de error, con la regla que resuelve cada uno |
| `docs/especificacion/05-hoja-de-ruta.md` | Etapas y tareas; el desarrollo sigue este orden |
| `docs/especificacion/06-textos-de-envio.md` | Plantillas de email y WhatsApp que acompañan a cada PDF |
| `docs/prototipos/` | Prototipos HTML (referencia visual) y `capturas/` en PNG |
| `docs/modelos/` | Modelos de PDF (liquidación, resumen de depósito, recibo) y Excel de exportación |
| `docs/marca/` | Logo de la aplicación (Mosaico) en SVG |
| `docs/CAMBIOS.md` | Registro de cambios respecto de la especificación (ver "Regla de mantenimiento") |

Ante una duda funcional, la respuesta está en la especificación. Si no está, o hay contradicción, preguntá al usuario antes de inventar una regla.

## Stack (sección 6 de la especificación)

- TypeScript en todo el proyecto.
- Monorepo con pnpm workspaces y Turborepo.
- `apps/web`: Next.js (React). `apps/mobile`: React Native con Expo.
- Base local SQLite (expo-sqlite en móvil, SQLite WASM en web) y nube Supabase (PostgreSQL, Auth, Storage, Edge Functions).
- Drizzle ORM para el esquema; Zod para validaciones compartidas.
- Sincronización offline-first: PowerSync es la opción recomendada. La decisión final (PowerSync o desarrollo propio) se toma con el usuario en la Preparación técnica y se registra en `docs/CAMBIOS.md`.
- Google Maps para la ubicación de los bienes (RF-28).

Estructura:

```
apps/
  web/          Next.js
  mobile/       Expo
packages/
  domain/       reglas de negocio y contables puras (sin UI ni base de datos)
  db/           esquema Drizzle y migraciones
  sync/         configuración de sincronización
  ui/           componentes y tokens de diseño compartidos
  i18n/         archivos de textos por idioma
supabase/
  migrations/   SQL y políticas RLS
  functions/    PDF, envíos, IPC
docs/           especificación, prototipos, modelos, marca y registro de cambios
```

## Reglas que no se negocian

1. **Importes**: siempre en centavos, como entero (`BIGINT` en Postgres, `integer` en SQLite). Nunca `float` ni `number` decimal para dinero. Cada importe lleva su moneda (ARS o USD).
2. **Monedas**: pesos y dólares nunca se compensan ni se convierten solos (RN-14). Un traspaso entre monedas es un movimiento explícito con tipo de cambio.
3. **Contabilidad**: nada se borra. Toda corrección es un contramovimiento (RN-05, RF-19). Los registros contables (pagos, cobros, movimientos) son solo de inserción. El saldo del propietario no se guarda: se calcula como suma de `haber − debe`.
4. **Claves primarias**: UUID v7 generadas en el cliente. Todas las tablas llevan `organizacion_id`, `created_at`, `updated_at`, `deleted_at` y `version` (sección 5.1).
5. **Seguridad**: políticas RLS de Supabase en todas las tablas (SEG-02). La clave `service_role` nunca va al cliente. Los secretos van en archivos `.env` que nunca se suben a Git.
6. **Lógica de negocio**: vive en `packages/domain`, en funciones puras, con pruebas automáticas. Cada prueba lleva en su nombre el código de la regla que verifica (por ejemplo `RN-04: pasa a Vencida…`). Cobertura mínima del 80 % en ese paquete (RNF-05).
7. **Idiomas**: la versión 1.0 es solo en español (Argentina). Igual, ningún texto visible se escribe dentro de una pantalla: todo va en `packages/i18n/es-AR.json` con una clave. Importes y fechas con formato `es-AR` ($ 41.300; 14/10/2026). Los selectores de idioma quedan ocultos hasta la traducción posterior a la 1.0.
8. **Diseño**: usar solo los tokens de color de la sección 12 del mapa de pantallas (modo claro y oscuro), con Source Serif 4 para títulos e importes destacados e IBM Plex Sans para el resto. Los prototipos de `docs/prototipos/` son la referencia visual.
9. **Nombres**: tablas y campos exactamente como en el diccionario de datos (español, `snake_case`, sin tildes: `bien`, `bien_propietario`, `obligacion`). Las funciones de dominio también en español (`calcularMontoADepositar`). Comentarios y mensajes de commit en español.
10. **Numeración de documentos**: por tipo y año, correlativa y sin reutilizar: LIQ-AAAA-NNNN, DEP-AAAA-NNNN, REC-AAAA-NNNN.

## Forma de trabajo

- Seguí el orden de `docs/especificacion/05-hoja-de-ruta.md`: una tarea por vez.
- Para cada tarea: leé las secciones de la especificación que la afectan, proponé un plan breve, implementalo, corré las pruebas y verificá que la app levante.
- Al terminar una tarea que funciona, hacé un commit con un mensaje claro en español. No hagas `git push`: el usuario sube los cambios a GitHub él mismo.
- Usá las capturas y los prototipos para que cada pantalla se parezca a lo diseñado.
- No agregues funciones que no estén en la especificación sin preguntar.

## Versiones

Cada vez que se genera una versión (APK y AAB de la app móvil) se hace en este orden: (1) definir el número MAYOR.MENOR.PARCHE; (2) escribir en `docs/VERSIONES.md` el resumen de lo más relevante hecho desde la versión anterior, en lenguaje claro para el usuario y con el modelo que figura en ese archivo; (3) actualizar `version` y `android.versionCode` (siempre mayor que el anterior) en `apps/mobile/app.json`; (4) correr las pruebas; (5) generar con `pnpm --filter mobile generar:android`; (6) comitear. No se genera una versión sin su resumen.

## Regla de mantenimiento

La especificación online (un documento vivo que el usuario mantiene con Claude en su proyecto de claude.ai) es la fuente de verdad. Los archivos de `docs/especificacion/` son una copia.

Cada vez que durante el desarrollo se decida algo que cambia o completa la especificación (una regla, un campo, una pantalla, un formato de PDF o Excel, la elección de una librería), anotalo en `docs/CAMBIOS.md` con fecha, qué cambió, por qué y qué partes afecta (pestaña del documento, pantalla P-xx, regla, modelo de PDF o Excel). No modifiques los archivos de `docs/especificacion/`: el usuario lleva `docs/CAMBIOS.md` a su proyecto de claude.ai, allí se actualizan el documento, los prototipos y los modelos, y luego se reemplaza la copia local.

## Comandos (se completan a medida que se arma el proyecto)

- Instalar dependencias: `pnpm install`
- Web en modo desarrollo: `pnpm --filter web dev`
- App móvil: `pnpm --filter mobile start` (se abre con Expo Go en el teléfono)
- App móvil con ingreso por Google o enlaces del email: `pnpm --filter mobile movil`. Supabase no acepta direcciones con número IP como retorno; este comando hace que Expo use un nombre (192-168-x-x.sslip.io). Si el router bloquea ese nombre, en el teléfono se configura el DNS de Google (8.8.8.8 o, en Android, DNS privado `dns.google`)
- Generar APK y AAB de la app móvil: `pnpm --filter mobile generar:android` (quedan en `apps/mobile/releases/<versión>/`; ver la sección "Versiones")
- Pruebas: `pnpm test` (dominio y textos del sistema). Cobertura del dominio (mínimo 80 %): `pnpm --filter @ai/domain cobertura`
- Tipos de todo el proyecto: `pnpm typecheck`. Estilo de código de la web: `pnpm --filter web lint`
- Web como en producción (más rápida que el modo desarrollo; hay que volver a compilar al cambiar variables de entorno): `pnpm --filter web build` y `pnpm --filter web start`
- Base de datos (Supabase, proyecto `adminsmart` en São Paulo): las migraciones de `supabase/migrations/` se aplican con `npx supabase db query --linked --project-ref <ref> -f supabase/migrations/<archivo>.sql`, en este orden: bloque1_1, bloque1_2, bloque1_3, bloque2_1, bloque2_2, bloque2_3, bloque3_1 a bloque3_6, ingreso_1, ingreso_2, propietarios_1, cuentas_1, cuentas_2, titularidad_1, liquidacion_1, liquidacion_2, pagos_1, movimientos_1, resumen_1, seguridad_1 y auditoria_2_configuracion. Las funciones del servidor se publican con `npx supabase functions deploy <nombre> --project-ref <ref> --use-api` y el código de instalación con `npx supabase secrets set CODIGO_INSTALACION=... --project-ref <ref>`
- Datos de prueba: `supabase/demo/` (propietarios, bienes, servicios, obligaciones, datos de la administración y cuentas demo, operador y propietario, con contraseña 123456). Antes de cargar datos reales se ejecuta `limpiar_datos_prueba.sql` (ver `docs/ANTES_DE_DATOS_REALES.md`)
- Cambiar un texto o agregar uno nuevo con el servidor de desarrollo abierto puede dejar claves técnicas en pantalla: detener `pnpm --filter web dev`, borrar `apps\web\.next` y volver a iniciarlo
