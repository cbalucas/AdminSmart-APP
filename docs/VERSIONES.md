# Versiones de AdminSmart

Registro de las versiones de la aplicación, de la más nueva a la más vieja. Cada versión tiene un resumen de lo más relevante, pensado para quien administra (no para quien programa).

## Cómo se numeran las versiones

Se usan tres números: **MAYOR.MENOR.PARCHE** (por ejemplo, 1.0.0).

| Número | Cuándo sube | Ejemplo |
| --- | --- | --- |
| MAYOR | Termina una fase del plan o hay un cambio grande que modifica la forma de trabajar | 1.0.0 → 2.0.0 (Fase 2: alquileres) |
| MENOR | Se suma una función o una pantalla nueva sin cambiar lo anterior | 1.0.0 → 1.1.0 (envío de resumen por email) |
| PARCHE | Se corrigen errores o se pulen detalles, sin funciones nuevas | 1.0.0 → 1.0.1 |

La app del teléfono además lleva un **código de compilación** (`versionCode`), un número entero que sube de a uno con cada archivo que se genera para Google Play; Google no acepta dos archivos con el mismo código.

## Cómo se genera una versión nueva

1. Decidir el número nuevo y escribir el resumen en este archivo (modelo al final).
2. Actualizar `version` y `android.versionCode` en `apps/mobile/app.json`.
3. Pasar las pruebas (`pnpm test`, `pnpm typecheck`, `pnpm --filter web lint`).
4. Generar los archivos con `pnpm --filter mobile generar:android`. Quedan en `apps/mobile/releases/<versión>/` como `AdminSmart-<versión>-<código>.apk` (para instalar en el teléfono) y `.aab` (para Google Play).
5. Comitear con un mensaje del estilo "Versión 1.1.0: …" y, si corresponde, crear la etiqueta `v1.1.0`.

---

## 1.0.0 — 22/10/2026 — Fase 1: gastos y depósitos

**Código de compilación:** 1 · **Identificador de la app:** `com.adminsmart.app` · **Base de datos:** Supabase, región São Paulo (25 migraciones, hasta `auditoria_2_configuracion`).

### En una línea

Primera versión completa de la Fase 1: la administración carga bienes, impuestos y servicios; registra pagos; lleva la cuenta corriente de cada propietario y le informa cuánto debe depositar. La gestión completa vive en la **versión web**; la **app del teléfono** trae por ahora el acceso y la cuenta.

### Lo más relevante

**Acceso y seguridad**
- Ingreso con email o usuario y contraseña, o con Google; recuperación de contraseña; "recordar mi email".
- Tres roles: administrador (todo), operador (solo sus bienes) y propietario (solo mira lo suyo). Los permisos están aplicados en la base de datos, no solo en la pantalla.
- Auditoría automática de todo cambio, con consulta, filtros y exportación a Excel. El administrador puede activarla o desactivarla en general o por propietario; lo que mueve dinero se audita siempre.

**Propietarios**
- Alta y edición con foto, teléfonos, emails, apoderado, periodicidad de liquidación y horizonte del resumen de depósito.
- Cuentas bancarias (propias o compartidas entre cotitulares) y activación o desactivación.
- Ficha con solapas Datos, Bienes (con la situación de cada bien) y Cuenta corriente (últimos dos meses).

**Bienes**
- Inmuebles (con edificios y unidades), terrenos, vehículos y otros. Titularidad con porcentajes y representante, estado del bien y "Gastos varios" por propietario.
- Servicios e impuestos de cada bien. Cada bien muestra su situación: con deuda, montos por completar, al día o sin obligaciones.

**Obligaciones y pagos**
- Carga de obligaciones con boleta adjunta (foto o PDF), estados automáticos (pendiente, vencida, a completar, pagada) y gastos recurrentes que se generan solos.
- Ventana de fin de mes para completar los montos de los gastos recurrentes.
- Pago de una obligación o pago directo de un gasto no cargado, con comprobante. Débito al propietario según su titularidad. Anulación con contramovimiento: nada se borra.

**Cuenta corriente**
- Libro por propietario y por moneda (pesos y dólares nunca se mezclan). Movimientos manuales, traspaso entre monedas con cotización, anulaciones y exportación a Excel.

**Resumen de depósito**
- Cálculo de cuánto depositar con horizonte de 30 días, fin de mes o una fecha; pagos futuros ya conocidos; reposición del fondo de reserva.
- PDF numerado (DEP-AAAA-NNNN) y envío por WhatsApp con plantillas editables. El envío por email quedó para una versión posterior.

**Inicio y exportaciones**
- Inicio de gestión con indicadores y accesos rápidos; inicio del propietario con su saldo, lo que debe depositar, sus obligaciones, sus bienes y sus resúmenes.
- Exportación a Excel de Obligaciones, Cuenta corriente y Auditoría con el formato del modelo.

**Configuración**
- Datos de la administración (logo y cuenta de depósito), preferencias, plantillas de envío, catálogo de conceptos y auditoría.

**Diseño**
- Modo claro y oscuro, menú lateral contraíble, tarjetas e indicadores, formularios con secciones e íconos, filtros que se aplican solos, acciones con ícono y descripción al pasar el mouse. Funciona en computadora y en celular.

**App del teléfono (Android)**
- Configuración inicial, ingreso (con Google), recuperación de contraseña, inicio provisorio y mi cuenta. Las pantallas de gestión llegan en versiones siguientes.

### Calidad

- 306 pruebas automáticas de las reglas de negocio (cobertura: 100 % de líneas y 96 % de ramas) y pruebas de los textos del sistema.
- Permisos de operador y de propietario comprobados contra la base de datos; ninguna función de la base se ejecuta sin haber iniciado sesión.

### Qué no incluye (queda para próximas versiones)

- Alquileres, inquilinos, contratos y liquidaciones (Fase 2).
- Envío del resumen de depósito por email (requiere validar el correo de Gmail).
- Mapa interactivo de ubicación (hoy, enlace a Google Maps), sincronización sin conexión, invitación de usuarios y doble factor, cifrado de CBU y depuración de la auditoría a los 5 años.
- Datos reales: hoy la base tiene datos de prueba; antes de cargar los reales hay que seguir `docs/ANTES_DE_DATOS_REALES.md`.

### Archivos generados

**Pendiente.** El primer intento de compilar en esta PC falló por un límite de Windows: las rutas de archivos largas están desactivadas y las bibliotecas de la app tienen rutas de más de 250 caracteres. Para resolverlo hay que activar "rutas largas" en Windows (un paso de administrador, ver el mensaje del 22/10/2026 o la guía de abajo) y volver a ejecutar `pnpm --filter mobile generar:android`.

Cuando se generen quedarán como `AdminSmart-1.0.0-1.apk` (para instalar en un teléfono Android) y `AdminSmart-1.0.0-1.aab` (para Google Play), y se tacha esta nota.

**Importante:** esta primera compilación se firma con la clave de depuración. Sirve para probar en el teléfono, pero **Google Play no la acepta**: para publicar hace falta crear la clave de firma definitiva.

## Guía: activar las rutas largas de Windows (una sola vez)

1. Abrir el menú Inicio, escribir **PowerShell**, clic derecho en "Windows PowerShell" y elegir **Ejecutar como administrador**.
2. Pegar esta línea y apretar Enter:
   `Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem' -Name LongPathsEnabled -Value 1`
3. **Reiniciar la computadora.**
4. Volver a ejecutar la generación (`pnpm --filter mobile generar:android`).

---

## Modelo para una versión nueva

```
## X.Y.Z — DD/MM/AAAA — título corto

**Código de compilación:** N · **Base de datos:** migraciones nuevas (si hay)

### En una línea
Qué cambia para quien administra.

### Lo más relevante
- Novedades:
- Mejoras:
- Correcciones:

### Cambios que afectan la especificación
Referencia a docs/CAMBIOS.md (si corresponde).

### Qué no incluye / queda pendiente

### Archivos generados
```
