# Especificación Funcional y Técnica — Administración Inteligente

Oct 13, 2026 · @Lucas

**Versión 1.0 — final**, aprobada el 14/10/2026. Es un documento vivo: cada cambio o modificación que surja durante el desarrollo se incorpora aquí y en las demás pestañas, los prototipos y los modelos.

## 1. Introducción

El sistema permitirá administrar bienes (inmuebles, terrenos, vehículos y otros) de uno o varios propietarios, controlar impuestos, servicios y alquileres, e informar a cada propietario el importe exacto que debe depositar. Este documento es la referencia funcional, contable y técnica previa al desarrollo del código.

**Alcance.** Una aplicación web y una aplicación móvil que comparten la misma lógica y base de datos. Debe operar en modo local (sin conexión) y en modo nube (Supabase), con sincronización entre ambos.

**Fuera de alcance en la primera versión:** facturación electrónica ante AFIP/ARCA, pago directo de boletas desde la aplicación y portal de autogestión para inquilinos.

### Glosario

| Término | Definición |
| --- | --- |
| Administrador | Usuario que gestiona los bienes por cuenta de los propietarios. |
| Propietario | Persona humana o jurídica titular de uno o más bienes. |
| Bien | Todo lo que se administra. Un campo tipo de bien lo clasifica en Inmueble (casa, departamento, local, cochera), Terreno, Vehículo u Otros; el bien Gastos varios de cada propietario es de tipo Otros. |
| Inquilino | Locatario que ocupa el bien bajo un contrato de locación. |
| Contrato de locación | Acuerdo que fija vigencia, canon locativo, ajustes y obligaciones a cargo de cada parte. |
| Canon locativo | Monto del alquiler mensual; puede variar en el tiempo por actualizaciones. |
| Concepto | Tipo de impuesto, tasa, servicio o expensa (Municipalidad, Rentas, luz, gas, agua, expensas, seguro y otros). |
| Obligación | Cada vencimiento concreto de un concepto: período, monto, fecha de vencimiento y responsable. |
| Pago | Registro de la cancelación total de una obligación. |
| Responsable | Parte a cuyo cargo está la obligación: Propietario o Inquilino. |
| Cuenta corriente | Registro cronológico de débitos y créditos de un propietario frente a la administración. Una por moneda (ARS y USD). |
| Liquidación | Resumen periódico al propietario: ingresos, egresos, honorarios y saldo a transferir o a depositar. |
| Gasto recurrente | Obligación que se repite con una frecuencia; el sistema genera la siguiente sin monto, en estado A completar. |
| Resumen de depósito | Informe del monto que el propietario debe depositar para cubrir sus obligaciones en un horizonte, neto de su saldo. |
| Pago promedio | Promedio mensual de los depósitos del propietario en los últimos 12 meses, por moneda. |

## 2. Objetivos y roles

El objetivo central es que cada propietario conozca, en todo momento, qué se pagó, qué está pendiente y cuánto debe depositar.

### Objetivos

1. Centralizar el registro de propietarios, bienes, inquilinos y contratos.
2. Registrar impuestos y servicios con concepto, período, monto, vencimiento y responsable.
3. Llevar el historial completo de pagos y de obligaciones pendientes.
4. Mantener el historial del canon locativo y sus actualizaciones.
5. Emitir un resumen de saldo y una liquidación mensual por propietario.
6. Funcionar con y sin conexión, en web y en móvil.

### Roles y permisos

| Rol | Alcance | Puede |
| --- | --- | --- |
| Administrador | Todos los bienes de su cuenta | Crear, editar y anular todo; emitir liquidaciones; registrar pagos y cobros. |
| Operador | Bienes asignados y el Gastos varios de sus propietarios | Cargar obligaciones y pagos; dar de alta usuarios Propietario de sus bienes; no anula ni emite liquidaciones. |
| Propietario (lectura) | Solo sus bienes | Consultar saldo, historial, pendientes y descargar liquidaciones. |
| Inquilino (fase futura) | Solo su contrato | Consultar obligaciones a su cargo y adjuntar comprobantes. |

Un mismo usuario puede tener más de un rol: un propietario puede ser, además, administrador u operador. Los permisos se suman; como propietario ve sus bienes y, como administrador u operador, el alcance propio de ese rol.

## 3. Requerimientos funcionales

El sistema se organiza en nueve módulos; cada requerimiento lleva un código (RF-xx) para trazarlo luego en el desarrollo y las pruebas.

### 3.1 Propietarios

- **RF-01** Alta, baja lógica y edición de propietarios: tipo de persona, nombre o razón social, teléfonos, correos y una o varias cuentas bancarias (una cuenta puede ser compartida por varios propietarios). Cada propietario tiene una cuenta corriente en pesos y, si opera en dólares, otra en dólares. La ficha incluye idioma de informes, avatar opcional y pago promedio.
- **RF-02** Un bien puede tener varios propietarios (condominio) con porcentaje de participación; la suma debe ser 100 %.
- **RF-03** Honorarios de administración según el acuerdo individual con cada propietario: porcentaje sobre el alquiler cobrado o monto fijo mensual. La modalidad y el valor pueden ser distintos para cada propietario.

### 3.2 Bienes

- **RF-04** Alta y edición de bienes, con un campo tipo de bien: Inmueble (subtipo, dirección, ubicación, unidad funcional, estado), Terreno (dirección, ubicación, estado), Vehículo (dominio, marca y modelo, año) u Otros. El bien Gastos varios, de tipo Otros, lo crea el sistema para cada propietario para los gastos generales a su cuenta.
- **RF-05** Servicios e impuestos del bien en una lista abierta, separada de la ficha (luz, agua, gas, expensas, municipalidad, rentas u otros), con su número de cuenta o cliente. Se usan para generar y autocompletar obligaciones.
- **RF-06** Ficha del bien con pestañas: datos, contrato vigente, obligaciones, pagos, documentos.
- **RF-28** Ubicación del bien (inmuebles y terrenos): la dirección se abre en Google Maps con un toque. También se puede marcar el punto en un mapa: la app guarda latitud y longitud y completa la dirección. Si no se marca punto, Maps busca por la dirección escrita.

### 3.3 Inquilinos y contratos

- **RF-07** Alta de inquilinos con datos de contacto, identificación opcional, idioma de informes y avatar opcional. Un contrato tiene un único inquilino; no se registran garantes.
- **RF-08** Contrato de locación: fechas de inicio y fin (opcionales), canon inicial, moneda (ARS por defecto o USD), modalidad de cobro por defecto, índice de actualización pactado (solo como referencia) y periodicidad (mensual, trimestral, cuatrimestral, semestral, anual).
- **RF-09** Matriz de responsabilidad por contrato: para cada concepto se indica si lo paga el Propietario o el Inquilino. Al generar obligaciones se hereda este valor.
- **RF-10** Historial del canon locativo: cada cambio de monto se registra como un nuevo tramo con fecha de vigencia desde/hasta, monto, motivo (inicial, actualización por índice, renegociación) e índice aplicado. Nunca se sobrescribe un tramo anterior.
- **RF-11** Alerta de próxima actualización y de vencimiento del contrato (por defecto 60 y 30 días antes).

### 3.4 Conceptos (catálogo)

- **RF-12** Catálogo configurable de conceptos: nombre, categoría (impuesto, tasa, servicio, expensa, seguro, otro), organismo o empresa, periodicidad habitual y responsable por defecto.

### 3.5 Obligaciones (impuestos y servicios)

- **RF-13** Registro de obligación: bien, concepto, período (siempre mes y año; el número de cuota se anota en observaciones), monto, moneda, fecha de vencimiento (opcional), responsable, código de pago electrónico y boleta adjunta (PDF o foto).
- **RF-14** Gastos recurrentes: al cargar un gasto se indica si es recurrente y su frecuencia (mensual, bimestral, trimestral, etc.). El sistema genera el del período siguiente sin monto, y antes de fin de mes pide en una ventana los montos y vencimientos que falten.
- **RF-15** Estados: A completar (gasto recurrente generado sin monto), Pendiente, Vencida, Pagada, Anulada. El estado Vencida se calcula por fecha.
- **RF-16** Filtros por propietario, bien, concepto, responsable, estado y rango de fechas.

### 3.6 Pagos

- **RF-17** Registro de pago: obligación, fecha, importe, medio de pago, quién pagó (administración con fondos del propietario, propietario directo, inquilino) y comprobante adjunto.
- **RF-18** Cada pago cancela una sola obligación por completo y en su misma moneda; no se admiten pagos parciales ni pagos múltiples.
- **RF-19** La anulación de un pago no lo borra: genera un contramovimiento y queda en auditoría.

### 3.7 Cobros de alquiler

- **RF-20** Generación mensual del alquiler a cobrar según el tramo de canon vigente, en la moneda del contrato.
- **RF-21** Registro de cobro al inquilino: fecha, importe, moneda, medio, punitorios por mora, recibo en PDF y quién lo percibió: Administración (impacta la cuenta corriente del propietario) o Directo al propietario (solo queda como registro de historial). La modalidad se hereda del contrato y puede modificarse en cada cobro.
- **RF-22** Las obligaciones a cargo del inquilino que la administración abone por él se suman a su deuda y se recuperan en el siguiente cobro.

### 3.8 Historial, resumen y liquidación

- **RF-23** Historial cronológico de lo pagado y de lo pendiente, por bien y por propietario.
- **RF-24** Resumen de depósito: importe que el propietario debe depositar para cubrir las obligaciones pendientes a su cargo en un horizonte elegido (por ejemplo, próximos 30 días), neto de los fondos disponibles en su cuenta corriente, calculado por separado en pesos y en dólares.
- **RF-25** Liquidación mensual al propietario en PDF: alquileres cobrados, egresos pagados por su cuenta, honorarios, saldo a transferir o a depositar.

### 3.9 Índice IPC (informativo)

- **RF-26** Registro histórico del IPC del INDEC por período: variación mensual (actual), acumulado del año calendario y acumulado interanual.
- **RF-27** El IPC es solo informativo: no se aplica automáticamente a ninguna operación. Se consulta junto al contrato para que el administrador decida el ajuste y lo cargue manualmente como nuevo tramo de canon.

## 4. Reglas de negocio y criterio contable

Toda operación se asienta en una cuenta corriente por propietario con partida doble simplificada: nada se borra, todo se corrige con un contramovimiento.

### 4.1 Responsable del pago

- **RN-01** Cada obligación tiene un responsable: Propietario o Inquilino. Se hereda de la matriz del contrato vigente; si el bien no está alquilado, el responsable es siempre el Propietario.
- **RN-02** Solo las obligaciones a cargo del Propietario afectan su cuenta corriente y el resumen de depósito.
- **RN-03** Las obligaciones a cargo del Inquilino se controlan igual (vencimiento y comprobante), pero si las abona la administración se registran como deuda del inquilino y no como egreso del propietario.

### 4.2 Estados y vencimientos

- **RN-04** Una obligación pasa a Vencida cuando tiene fecha de vencimiento, la fecha actual la supera y no tiene un pago registrado.
- **RN-05** Una obligación pasa a Pagada al registrarse su pago; si el pago se anula, vuelve a Pendiente o Vencida.
- **RN-06** Los montos se guardan en centavos (entero) para evitar errores de redondeo. Moneda por defecto ARS; contratos, obligaciones y movimientos pueden registrarse en USD, y cada importe conserva su moneda original.

### 4.3 Canon locativo e historial

- **RN-07** Solo un tramo de canon puede estar vigente para una fecha dada; los tramos no se superponen.
- **RN-08** El alquiler de un mes se calcula con el tramo vigente al primer día del período.
- **RN-09** La actualización del canon es manual: el administrador carga el nuevo monto como un nuevo tramo. El sistema no calcula ajustes; el IPC se muestra solo como referencia.

### 4.4 Cuenta corriente del propietario

| Movimiento | Efecto en el saldo del propietario |
| --- | --- |
| Alquiler percibido por la administración | Crédito (+) |
| Depósito del propietario a la administración | Crédito (+) |
| Pago de obligación a cargo del propietario | Débito (−) |
| Honorarios de administración | Débito (−) |
| Transferencia de fondos al propietario | Débito (−) |
| Gasto extraordinario (reparaciones) | Débito (−) |
| Ajuste manual | Crédito (+) o débito (−), con motivo |
| Traspaso entre pesos y dólares | Débito en una moneda y crédito en la otra, con tipo de cambio |
| Anulación | Movimiento inverso al original |

En condominio, cada movimiento del bien se reparte según la regla del concepto: por porcentaje de titularidad (por defecto), asumido por un solo propietario o con porcentajes propios. Cada bien define si liquida a cada condómino por separado o a un representante.

- **RN-13** Un cobro de alquiler marcado como Directo al propietario deja el período como cobrado y queda en el historial, pero no genera movimiento en la cuenta corriente. Del mismo modo, una obligación que el propietario paga por su cuenta queda Pagada sin debitar su cuenta corriente.
- **RN-14** Cada propietario tiene cuentas corrientes separadas por moneda (ARS y USD). Los movimientos se registran en la moneda de la operación y no se convierten automáticamente; un traspaso entre monedas se registra como movimiento explícito con el tipo de cambio aplicado.
- **RN-16** El pago promedio del propietario es el promedio mensual de sus depósitos de los últimos 12 meses, por moneda, sin contar los ajustes (PRO-11).

### 4.5 Cálculo del monto a depositar

El resumen informa al propietario cuánto debe depositar para afrontar sus obligaciones en el horizonte elegido:

```latex
\text{A depositar} = \max\left(0,\; \sum \text{saldos pendientes a cargo del propietario con vencimiento} \le \text{fecha límite} \;-\; \text{saldo disponible en cuenta corriente}\right)
```

Si el saldo disponible supera las obligaciones, el resultado es cero y el excedente se informa como saldo a transferir al propietario. El cálculo se realiza por separado para cada moneda; nunca se compensan pesos con dólares. Si el propietario tiene fondo de reserva, se suma su reposición (PRO-09).

- **RN-15** Un gasto recurrente generado sin monto (A completar) no suma al monto a depositar hasta tener monto; figura como "a confirmar". Una obligación con monto pero sin vencimiento figura aparte como posible obligación y tampoco se suma (OBL-07, OBL-11).

### 4.6 Honorarios

- **RN-10** La modalidad (porcentaje o monto fijo) y su valor se pactan individualmente con cada propietario. Si son porcentuales, se calculan sobre el alquiler efectivamente cobrado en el mes, no sobre el devengado; el acuerdo indica si incluyen los cobros directos al propietario.
- **RN-11** Se debitan al emitir la liquidación del período.

### 4.7 Cierre de período

- **RN-12** Emitida una liquidación, el período queda cerrado: los movimientos con fecha en ese período no pueden editarse; cualquier corrección se registra en el período abierto siguiente. Como excepción, el administrador puede reabrir la última liquidación emitida de un propietario.

## 5. Modelo de datos

El modelo gira en torno al bien: de él cuelgan los contratos, las obligaciones y los movimientos, y todo converge en la cuenta corriente del propietario.

&#91;embedded content: modelo de datos · 14 entidades principales\]

Cada movimiento identifica al propietario y al bien; la liquidación agrupa los movimientos de un período y lo cierra.

### 5.1 Convenciones

- Claves primarias UUID v7 generadas en el cliente: permiten crear registros sin conexión sin colisiones.
- Todas las tablas llevan `organizacion_id`, `created_at`, `updated_at`, `deleted_at` (baja lógica) y `version` para resolver conflictos de sincronización.
- Importes en `BIGINT` (centavos) más columna `moneda`. Fechas en `DATE`; marcas de tiempo en UTC.

### 5.2 Entidades

| Entidad | Atributos principales | Relaciones |
| --- | --- | --- |
| organizacion | nombre, cuit, logo, contacto, cuenta\_deposito, email\_envio | Registro único con los datos de la administración. |
| usuario | email, nombre, roles, propietario\_id | Puede tener varios roles; si es propietario, se vincula a su ficha. |
| propietario | tipo\_persona, nombre\_razon\_social, telefonos, emails, idioma\_informes, avatar, estado | N:M con bien. |
| bien | tipo\_bien (inmueble, terreno, vehículo, otros), subtipo, alias, direccion, latitud, longitud, unidad\_funcional, dominio, marca\_modelo, anio, estado, edificio\_id | Tiene contratos, obligaciones, documentos. |
| bien\_propietario | bien\_id, propietario\_id, porcentaje | Tabla puente del condominio. |
| inquilino | nombre, documento, contacto, idioma\_informes, avatar | Firma contratos. |
| garante | No se utiliza | Excluida del alcance: no se registran garantes. |
| contrato | bien\_id, inquilino\_id, inicio, fin, moneda, modalidad\_cobro, indice\_referencia, periodicidad\_ajuste, rescision\_fecha | Tiene tramos de canon y matriz de responsabilidad. |
| canon\_tramo | contrato\_id, vigente\_desde, vigente\_hasta, monto, moneda, motivo | Historial del alquiler. |
| concepto | nombre, categoria, organismo, periodicidad, responsable\_default | Catálogo. |
| contrato\_responsabilidad | contrato\_id, concepto\_id, responsable | Quién paga qué en cada contrato. |
| obligacion | bien\_id, concepto\_id, periodo, monto, moneda, vencimiento, responsable, descripcion, codigo\_pago, observaciones, estado, es\_recurrente, frecuencia | Recibe pagos. |
| pago | obligacion\_id, fecha, importe, medio, pagado\_por, comprobante\_url, anulado | Genera movimiento. |
| cobro\_alquiler | contrato\_id, periodo, importe, moneda, punitorios, fecha, medio, percibido\_por, recibo\_nro | Genera movimiento. |
| movimiento | propietario\_id, bien\_id, moneda, fecha, tipo, debe, haber, origen\_tipo, origen\_id, liquidacion\_id | Libro de la cuenta corriente. |
| liquidacion | propietario\_id, periodo, moneda, total\_ingresos, total\_egresos, honorarios, saldo, estado, pdf\_url | Cierra el período. |
| documento | entidad, entidad\_id, tipo, archivo\_url | Boletas, contratos, comprobantes. |
| auditoria | tabla, registro\_id, accion, antes, despues, usuario\_id, fecha | Trazabilidad completa. |

El saldo del propietario no se guarda: se calcula como suma de `haber − debe` de sus movimientos, lo que garantiza que el saldo siempre coincida con el detalle.

Se suma la entidad **indice\_ipc** (periodo, variacion\_mensual, acumulado\_anio, interanual), de carácter informativo y sin relación con las operaciones. Solo generan movimiento los cobros con `percibido_por = administracion` y los pagos realizados con fondos de la administración.

También se suman `cuenta_bancaria`, `propietario_cuenta` (N:M)`, acuerdo_honorarios, edificio y bien_servicio`, reparto\_concepto, plantilla\_envio y envio. El detalle de cada campo, su obligatoriedad y sus reglas está en Diccionario de datos.

## 6. Arquitectura de software

Se recomienda una arquitectura offline-first: cada dispositivo trabaja sobre una base SQLite local y sincroniza en segundo plano con Supabase (PostgreSQL), que es la fuente de verdad en la nube.

&#91;embedded content: arquitectura · clientes, sincronización y nube\]

Web y móvil comparten la misma lógica de negocio; en modo Solo local, PowerSync y Supabase no intervienen.

### 6.1 Por qué SQLite en local y Supabase en la nube

- **SQLite** es la base local más adecuada tanto en móvil (nativa) como en web (SQLite compilado a WebAssembly con persistencia en OPFS). Permite usar el mismo esquema SQL en todos los clientes.
- **Supabase** aporta PostgreSQL, autenticación, almacenamiento de archivos (boletas y comprobantes), seguridad por fila (RLS) y funciones de servidor.
- Ambos son SQL relacional: el esquema se define una sola vez y se replica con diferencias mínimas de tipos.

### 6.2 Modos de operación

| Modo | Base de datos | Uso previsto |
| --- | --- | --- |
| Solo local | SQLite en el dispositivo | Un administrador, un equipo, sin cuenta en la nube. Respaldo manual a archivo. |
| Nube con caché local (recomendado) | SQLite local + Supabase | Varios usuarios y dispositivos, acceso del propietario, trabajo sin conexión. |

El paso de Solo local a Nube se realiza con una migración que sube la base local completa a Supabase.

### 6.3 Sincronización

- Capa de sincronización: **PowerSync** (integración oficial con Supabase, SQLite en web y móvil). Alternativa propia: cola de cambios con `updated_at` y `version`.
- Las escrituras se aplican primero en SQLite y se encolan; al recuperar conexión se suben a Supabase.
- Conflictos: gana la última versión por campo, salvo en registros contables (pagos, cobros, movimientos), que son solo de inserción y no generan conflicto.
- Cada usuario descarga únicamente los datos de su organización y, si es propietario, solo los suyos.

### 6.4 Stack recomendado

| Capa | Tecnología | Motivo |
| --- | --- | --- |
| Lenguaje | TypeScript | Un solo lenguaje en web, móvil y servidor. |
| App móvil | React Native con Expo | Android e iOS desde una base de código. |
| Web | Next.js (React) o Expo Web | Reutiliza componentes y lógica. |
| Monorepo | Turborepo / pnpm workspaces | Paquetes compartidos: dominio, esquema, UI. |
| Base local | SQLite (expo-sqlite / wa-sqlite) | Misma base en ambos clientes. |
| Acceso a datos | Drizzle ORM | Esquema tipado común para SQLite y PostgreSQL. |
| Sincronización | PowerSync | Offline-first con Supabase. |
| Nube | Supabase: Postgres, Auth, Storage, Edge Functions | Backend administrado. |
| Validación | Zod | Reglas de negocio compartidas cliente/servidor. |
| Reportes | PDF generado en Edge Function | Liquidaciones y recibos. |

### 6.5 Estructura del monorepo

```
apps/
  web/          Next.js
  mobile/       Expo
packages/
  domain/       reglas de negocio (RN-xx), cálculos de saldo y canon
  db/           esquema Drizzle, migraciones SQLite y Postgres
  sync/         configuración PowerSync
  ui/           componentes compartidos
supabase/
  migrations/   SQL, políticas RLS
  functions/    liquidaciones PDF, consulta de IPC, notificaciones
```

La lógica contable vive en `packages/domain` y es independiente de la interfaz y de la base, lo que permite probarla de forma aislada.

## 7. Seguridad, permisos y auditoría

La seguridad se aplica en la base de datos, no solo en la interfaz: cada consulta queda filtrada por organización y rol mediante políticas RLS de Supabase.

- **SEG-01** Autenticación con Supabase Auth: correo y contraseña, enlace mágico y, opcionalmente, Google. Doble factor configurable por el administrador, desactivado por defecto.
- **SEG-02** Políticas RLS: todo registro exige `organizacion_id` igual al del usuario; un usuario que solo tiene el rol Propietario ve únicamente los bienes vinculados en `bien_propietario`.
- **SEG-03** Archivos en Supabase Storage con buckets privados y URLs firmadas de expiración corta.
- **SEG-04** Datos sensibles (CBU, documentos) cifrados en reposo; la base local del dispositivo se protege con el bloqueo del sistema y, en móvil, con SQLCipher.
- **SEG-05** Auditoría: un trigger en PostgreSQL registra en `auditoria` toda alta, modificación y anulación con valores anteriores y nuevos, usuario y fecha.
- **SEG-06** Respaldos: diarios automáticos en Supabase; en modo local, exportación manual y recordatorio mensual de respaldo.
- **SEG-07** Cumplimiento de la Ley 25.326 de Protección de Datos Personales: finalidad declarada, acceso y rectificación a pedido del titular.

## 8. Reportes, notificaciones y pantallas

La pantalla de inicio debe responder en un vistazo tres preguntas: qué vence pronto, qué está vencido y cuánto debe depositar cada propietario.

### 8.1 Pantallas principales

| Pantalla | Contenido |
| --- | --- |
| Tablero | Vencimientos de los próximos 7/30 días, obligaciones vencidas, alquileres por cobrar, saldo a depositar por propietario. |
| Propietarios | Listado con saldo; ficha con bienes, cuenta corriente, pago promedio y liquidaciones. |
| Bienes | Listado con estado; ficha con contrato, historial de canon, obligaciones y documentos. |
| Contratos | Vigentes, por vencer, próximos ajustes; matriz de responsabilidad. |
| Obligaciones | Grilla filtrable con acción rápida "Registrar pago" y carga de boleta por foto. Ventana de fin de mes para completar los gastos recurrentes. |
| Cobros | Alquileres del mes, estado de cobro, emisión de recibo. |
| Liquidaciones | Generación, vista previa, emisión en PDF y envío. |
| Configuración | Datos y logo de la administración, conceptos, índices, usuarios, plantillas de envío, modo local/nube. |

El inventario completo, con el contenido, las acciones y los roles de cada pantalla, está en Mapa de pantallas.

### 8.2 Reportes

- Resumen de depósito por propietario (RF-24), en pantalla y PDF para enviar.
- Liquidación mensual (RF-25).
- Historial de pagos por bien y por concepto.
- Evolución del canon locativo por contrato.
- Cuenta corriente detallada entre fechas.
- Gastos por bien y concepto.
- Honorarios del período.
- Deuda de inquilinos.
- Exportación a Excel o PDF.

### 8.3 Notificaciones

- Vencimientos próximos (configurable, por defecto 5 días antes) y vencidos.
- Alquiler no cobrado al día siguiente del vencimiento.
- Próximo ajuste del canon y vencimiento de contrato.
- Gastos recurrentes A completar: ventana al ingresar en los últimos días del mes (por defecto 5, configurable).
- Canales: notificación push en la app y correo electrónico, automáticos desde la Fase 4. El envío manual de PDF por email y WhatsApp, con plantillas editables, está desde la Fase 1.

## 9. Requerimientos no funcionales, fases y decisiones

El desarrollo se propone en cuatro fases; la primera entrega ya resuelve la necesidad central: obligaciones, pagos, gastos recurrentes y monto a depositar. Los alquileres se incorporan en la Fase 2.

### 9.1 Requerimientos no funcionales

| Código | Requerimiento |
| --- | --- |
| RNF-01 | Operación completa sin conexión; sincronización automática al reconectar. |
| RNF-02 | Tiempo de respuesta local menor a 300 ms en listados de hasta 10.000 registros. |
| RNF-03 | Interfaz adaptable: escritorio, tableta y teléfono. |
| RNF-04 | Multilenguaje: español (Argentina, por defecto), inglés y portugués, con formato de importes y fechas según el idioma elegido. Los informes salen en el idioma de informes de cada propietario o inquilino. La versión 1.0 se desarrolla solo en español, pero con todos los textos en archivos de idioma desde el inicio; el inglés y el portugués se agregan cuando la versión 1.0 esté funcionando, para no replicar cada cambio en tres idiomas. Modo claro y oscuro. |
| RNF-05 | Cobertura de pruebas unitarias mayor al 80 % en `packages/domain`. |
| RNF-06 | Exactitud contable: la suma de movimientos debe coincidir siempre con el saldo informado. |

### 9.2 Fases

1. **Fase 1 — MVP:** propietarios, bienes (inmuebles, terrenos, vehículos y otros, con su ubicación en Google Maps), titulares con reparto por porcentaje, conceptos, obligaciones con gastos recurrentes, pagos, historial, resumen de depósito con envío por email y WhatsApp, cuentas corrientes en pesos y dólares (depósitos, ajustes y saldo), pago promedio, idiomas, modo claro y oscuro, y acceso de propietarios en modo consulta. Modo local y nube.
2. **Fase 2 — Alquileres:** inquilinos, contratos, historial de canon, matriz de responsabilidad, cobros y recibos.
3. **Fase 3 — Contabilidad:** cuenta corriente completa, honorarios, liquidaciones en PDF, cierre de período, reglas de reparto por concepto y liquidación al representante en condominio.
4. **Fase 4 — Automatización:** histórico de IPC informativo, notificaciones y acceso de inquilinos.

**Plan alternativo (14/10/2026):** la Fase 1 se mantiene como está definida. Si el resultado no convence, se toma como base el Excel de gestión de gastos que hoy usa la administración: se automatiza o se usa como modelo de la Fase 1.

### 9.3 Criterios de aceptación (ejemplos)

- [ ] Al cargar una obligación de Municipalidad a cargo del propietario por $ 25.000 con vencimiento en 10 días, el resumen de depósito de ese propietario aumenta $ 25.000 si no tiene saldo a favor.
- [ ] Al cambiar el responsable de esa obligación a Inquilino, desaparece del resumen del propietario.
- [ ] Al registrar un nuevo tramo de canon desde el 01/11, los alquileres de octubre conservan el monto anterior.
- [ ] Al anular un pago, la obligación vuelve a Pendiente y la cuenta corriente muestra el contramovimiento.
- [ ] Un pago cargado sin conexión aparece en la web dentro del minuto siguiente a recuperar la conexión.
- [ ] Un gasto recurrente generado sin monto (A completar) no suma al monto a depositar hasta que se carga su monto.
- [ ] En un bien en condominio, un propietario al 60 % recibe el débito del 60 % de cada pago del bien.

### 9.4 Decisiones tomadas

| Tema | Decisión |
| --- | --- |
| Alcance | Una sola administración; no se requiere multiempresa. |
| Acceso de propietarios | Desde la Fase 1, en modo consulta. |
| Moneda | Pesos por defecto; pueden existir alquileres en dólares, con cuentas corrientes en ARS y USD por propietario. |
| Circuito de fondos | Mayormente por la cuenta de la administración; los cobros y pagos directos se registran solo como historial. |
| Índices | No se aplican a ningún cálculo. Histórico de IPC importado desde el INDEC, solo informativo: mensual, acumulado del año calendario e interanual. |
| Cuotas y períodos | El número de cuota (ej. 4/6) se anota en observaciones. El período es siempre mes y año, también en servicios bimestrales. |
| Pagos de terceros | No se registra un tercero como pagador: solo administración, propietario o inquilino. |
| Conciliación | No se concilia contra el saldo real de la cuenta de la administración. |
| Bienes | Todo se llama bien, con un campo tipo de bien: Inmueble, Terreno, Vehículo u Otros. Cada propietario tiene un bien Gastos varios, de tipo Otros. El listado se llama Bienes. |
| Formato de PDF y Excel | Encabezado con nombre y logo de la administración. Numeración por tipo y año (LIQ-2026-0001, DEP-2026-0001, REC-2026-0001). Recibo sin firma, identificado solo con el logo. En condominio, cada renglón muestra total del bien, porcentaje y la parte del propietario. Excel con hojas Leeme, Liquidación, Cuenta corriente, Obligaciones y Cobros. |
| Logos y avatares | Dos logos: el de la aplicación (Mosaico, fijo) y el de la administración (lo sube el administrador; encabeza PDF y emails). Propietarios e inquilinos pueden tener avatar opcional; sin imagen, iniciales. |
| Nombre y marca | La aplicación se llama Administración Inteligente. Colores de marca: azul #1F3A5F y ámbar #E8A33D. |
| Operador | Ve y carga el Gastos varios de los propietarios de sus bienes asignados. |
| Contratos | Se admiten contratos de alquiler sobre inmuebles y terrenos. |
| Plantillas de envío | El administrador edita los textos de email y WhatsApp desde Configuración (P-49). |
| Ubicación | Dirección con enlace a Google Maps y punto marcado en el mapa (latitud y longitud). |
