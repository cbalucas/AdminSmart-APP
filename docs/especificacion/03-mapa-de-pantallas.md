# Mapa de pantallas

Inventario de pantallas de la web y la app, con la información que muestra cada una, sus acciones y los roles que acceden. Cada pantalla lleva un código (P-xx) para trazarla en el diseño y el desarrollo.

## 1. Criterios generales

- **Navegación web:** menú lateral fijo con todas las secciones y barra superior con búsqueda global, notificaciones, estado de sincronización y usuario.
- **Navegación app:** barra inferior con cinco accesos: Inicio, Bienes, Operaciones, Propietarios y Más. Un botón flotante "+" abre las cargas rápidas: pago, cobro y obligación con foto de la boleta.
- **Reparto de tareas:** la app prioriza consultas y cargas rápidas en el momento; la web, las tareas extensas (liquidaciones, reportes, configuración). Todas las pantallas existen en ambas, salvo indicación.
- **Patrones comunes:** los listados tienen búsqueda, filtros, orden y exportación a Excel o PDF, y en la app un selector de vista (tarjetas o lista compacta) que se recuerda por usuario; las fichas se organizan en pestañas; los formularios validan al guardar y marcan los campos obligatorios; las anulaciones piden motivo y confirmación.
- **Indicadores permanentes:** moneda (ARS/USD) junto a cada importe, estado de sincronización y advertencia visible cuando se trabaja sin conexión.

## 2. Acceso

| Código | Pantalla | Información y contenido | Acciones | Roles |
| --- | --- | --- | --- | --- |
| P-01 | Inicio (splash) | Logo, nombre de la aplicación, versión y progreso de carga y sincronización inicial. | Ninguna; pasa sola a Ingreso o a Home si hay sesión activa. | Todos |
| P-02 | Ingreso | Logo, email, contraseña (con mostrar u ocultar), casilla "Recordar mi email" y mensajes de error claros. | Ingresar, Ingresar con Google, Ingresar con huella o rostro (app), Olvidé mi contraseña, Activar mi cuenta, Registrarme. | Todos |
| P-03 | Registro y activación | Dos caminos: activación por invitación (nombre, email y rol ya definidos; solo se crea la contraseña) o registro abierto (nombre, email, teléfono y contraseña), que queda pendiente de aprobación. | Activar cuenta, Enviar solicitud de registro. El administrador aprueba la solicitud y asigna rol y vínculos en P-41. El registro abierto puede deshabilitarse en P-43. | Invitados y nuevos usuarios |
| P-04 | Recuperar contraseña | Paso 1: email o teléfono. Paso 2: validación por enlace al email, código por SMS o código provisorio entregado por el administrador. Paso 3: nueva contraseña y confirmación. | Enviar enlace o código, Ingresar código, Reenviar, Guardar nueva contraseña. | Todos |
| P-05 | Doble factor | Código de verificación de 6 dígitos. | Verificar, Usar código de respaldo. Aparece según la política que fije el administrador en P-43: desactivado (por defecto), opcional por usuario u obligatorio para todos. | Todos |
| P-06 | Configuración inicial | Asistente del primer uso: datos de la administración, modo local o nube y alta del primer administrador. | Siguiente, Anterior, Finalizar. Solo aparece una vez. | Primer usuario |

El usuario es siempre el email; "recordar usuario" significa recordar el email en ese dispositivo.

## 3. Home y navegación

| Código | Pantalla | Información y contenido | Acciones | Roles |
| --- | --- | --- | --- | --- |
| P-07 | Home de gestión | Indicadores: obligaciones vencidas, vencimientos de los próximos 7 y 30 días, períodos de alquiler sin cobrar, saldo a depositar por propietario (ARS y USD), deuda de inquilinos y saldo total administrado (ARS y USD). Advertencias: tramos de canon incompletos e inconsistencias de estado de bienes. | Cargas rápidas (pago, cobro, obligación), ir al detalle de cada indicador. | Administrador, Operador |
| P-08 | Home del propietario | Saldo en ARS y USD, monto a depositar con su horizonte, obligaciones pendientes a su cargo, últimas liquidaciones y sus bienes con su estado. | Ver detalle, Descargar liquidación, Compartir resumen de depósito. | Propietario |
| P-09 | Notificaciones | Lista de avisos: vencimientos, períodos sin cobrar, contratos por vencer, próximos ajustes, tramos incompletos, errores de sincronización. Leídas y no leídas. | Abrir el objeto relacionado, Marcar como leída, Marcar todas. | Todos |
| P-10 | Búsqueda global | Resultados agrupados: propietarios, bienes, inquilinos, contratos, obligaciones. | Abrir resultado. | Según permisos |

## 4. Propietarios

| Código | Pantalla | Información y contenido | Acciones | Roles |
| --- | --- | --- | --- | --- |
| P-11 | Listado de propietarios | Avatar y nombre, cantidad de bienes, saldo ARS, saldo USD, monto a depositar, estado y si tiene acceso a la app. | Buscar, Filtrar, Nuevo, Abrir ficha, Exportar. | Administrador, Operador |
| P-12 | Ficha del propietario | Encabezado con avatar, saldo ARS y USD, monto a depositar y pago promedio. Pestañas: Datos y contacto (con cuentas bancarias y acuerdos de honorarios como secciones) · Bienes (con su porcentaje) · Cuenta corriente · Liquidaciones · Usuario de acceso · Documentos. | Editar, Cambiar foto, Desactivar, Invitar a la app, Ver resumen de depósito, Nueva liquidación, Nuevo acuerdo de honorarios, Agregar cuenta bancaria. | Administrador, Operador |
| P-13 | Alta y edición de propietario | Tipo de persona, nombre o razón social, avatar (foto o cámara), teléfonos, emails, idioma de informes, apoderado, periodicidad de liquidación, horizonte, fondo de reserva, observaciones. | Guardar, Cancelar. Advierte nombres duplicados (PRO-01). | Administrador, Operador |
| P-14 | Cuenta bancaria | Banco, tipo, moneda, CBU/CVU, alias, titular y propietarios vinculados con la marca de predeterminada. | Guardar, Vincular otro propietario, Desactivar. | Administrador |

## 5. Bienes (inmuebles, terrenos, vehículos y otros)

| Código | Pantalla | Información y contenido | Acciones | Roles |
| --- | --- | --- | --- | --- |
| P-15 | Listado de bienes | Alias, tipo de bien (inmueble, terreno, vehículo, otros), subtipo, dirección con enlace a Google Maps o dominio, propietarios, estado, inquilino actual, canon vigente, obligaciones vencidas. Filtro por tipo de bien. Advertencia si hay inconsistencia de estado. | Buscar, Filtrar por tipo de bien, estado, edificio o propietario, Nuevo, Abrir ficha. | Administrador, Operador (asignados) |
| P-16 | Ficha del bien | Pestañas: Datos (con ubicación en mapa, titulares y reparto como sección) · Servicios e impuestos · Obligaciones (con su estado de pago) · Documentos y fotos. Contratos, pagos y cobros se consultan en sus secciones, filtrados por el bien, con acceso directo desde la ficha. | Editar, Cambiar estado, Ver en Google Maps, Nuevo contrato, Nueva obligación, Agregar servicio. | Administrador, Operador; Propietario (solo lectura) |
| P-17 | Alta y edición de bien | Tipo de bien y, según él: Inmueble (subtipo, alias, edificio, dirección, ubicación en mapa, unidad funcional, estado), Terreno (alias, dirección, ubicación en mapa, estado), Vehículo (subtipo, alias, dominio, marca y modelo, año, estado) u Otros (alias, descripción, estado). Ubicación: botón Marcar en el mapa, que abre un mapa para fijar el punto, guarda las coordenadas y propone la dirección. Gastos varios no se da de alta: lo crea el sistema con cada propietario. | Marcar en el mapa, Ver en Google Maps, Guardar, Cancelar. | Administrador, Operador |
| P-18 | Titulares y reparto | Sección dentro de la ficha del bien. Titulares con porcentaje (debe sumar 100 %), representante, modo de liquidación y reglas de reparto por concepto. | Agregar titular, Definir reparto por concepto, Guardar. | Administrador |
| P-19 | Servicio o impuesto del bien | Concepto, número de cuenta o cliente, empresa prestadora, titular, responsable por defecto, periodicidad, día de vencimiento, monto estimado, débito automático, sitio de boletas. | Guardar, Desactivar. | Administrador, Operador |
| P-20 | Edificios | Sección propia en el menú. Listado y ficha: nombre, dirección y unidades que lo componen. | Nuevo, Editar, Agregar unidad. | Administrador, Operador |

## 6. Inquilinos y contratos

| Código | Pantalla | Información y contenido | Acciones | Roles |
| --- | --- | --- | --- | --- |
| P-21 | Listado de inquilinos | Avatar y nombre, bien actual, deuda pendiente, estado. | Buscar, Nuevo, Abrir ficha. | Administrador, Operador |
| P-22 | Ficha del inquilino | Pestañas: Datos (incluye idioma de informes y avatar) · Cobros · Deuda (gastos adelantados por la administración) · Documentos. Sus contratos se consultan en el listado de contratos, con acceso directo desde la ficha. | Editar, Desactivar. | Administrador, Operador |
| P-23 | Listado de contratos | Bien, moneda, canon vigente, estado calculado, modalidad de cobro. Un solo listado con filtro de estado (vigentes, por vencer, finalizados, rescindidos), por bien y por inquilino. | Filtrar, Nuevo, Abrir. | Administrador, Operador |
| P-24 | Nuevo contrato | Formulario único por secciones: bien; inquilino (existente o nuevo); moneda, canon inicial, modalidad de cobro, fechas, ajuste e índice de referencia; matriz de responsabilidad precargada; adjuntos. | Crear contrato, Cancelar. Valida que no haya otro vigente (CTR-02). | Administrador, Operador |
| P-25 | Ficha del contrato | Pestañas: Datos (con secciones de canon, con tramos, % de variación e IPC del período, y de quién paga qué) · Documentos. Los cobros se consultan en su sección, filtrados por el contrato. | Nuevo tramo, Editar matriz, Rescindir, Renovar (crea un contrato nuevo copiando bien, inquilino, matriz y último canon), Registrar cobro. | Administrador, Operador; Propietario (lectura) |

## 7. Operaciones

| Código | Pantalla | Información y contenido | Acciones | Roles |
| --- | --- | --- | --- | --- |
| P-26 | Obligaciones | Grilla: bien, concepto, empresa prestadora, período, monto y moneda, vencimiento, responsable, estado (con color; A completar en ámbar), con el tipo de bien y la marca de recurrente. Aviso con acceso a la ventana de fin de mes (P-48). Al abrir muestra todas. Filtros por propietario, bien, tipo de bien, concepto, responsable, estado y fechas. | Nueva, Registrar pago, Ver boleta, Exportar. | Administrador, Operador; Propietario (las suyas) |
| P-27 | Alta y edición de obligación | Bien (inmueble, terreno, vehículo u otros), servicio (o gasto suelto con descripción), período, recurrente y frecuencia, monto (puede quedar vacío hasta la boleta), moneda, vencimiento, responsable (heredado), código de pago, boleta (foto o PDF; solo se adjunta, sin lectura automática). | Guardar, Guardar y registrar pago, Anular. | Administrador, Operador |
| P-28 | Registrar pago | Obligación (o pago directo con bien, concepto y descripción), fecha, importe, quién pagó, medio, número de operación, comprobante. El impacto contable se aplica según quién pagó (PAG-04). | Guardar, Anular (con motivo). | Administrador, Operador |
| P-29 | Alquileres del período | Cuadro del mes: bien, inquilino, importe del tramo y estado (cobrado, sin cobrar, cobro directo). | Cambiar período, Registrar cobro, Ver recibo. | Administrador, Operador |
| P-30 | Registrar cobro | Contrato y período, fecha, importe propuesto, percibido por, punitorios, bonificación, gastos a recuperar, detalle del total visible antes de guardar, medio, comprobante. | Guardar, Guardar y emitir recibo, Anular (con motivo). | Administrador, Operador |
| P-31 | Recibo | Vista previa del recibo en PDF con número REC-AAAA-NNNN. | Descargar PDF, Compartir por WhatsApp (app). | Administrador, Operador |
| P-48 | Completar gastos del mes (ventana) | Aparece al ingresar en los últimos días del mes si hay gastos recurrentes del mes siguiente sin monto. Lista agrupada por propietario y bien: concepto, período, último monto pagado como referencia, campos de monto y vencimiento, boleta opcional. | Guardar los completados, Recordar más tarde, Dejar de repetir un gasto. | Administrador, Operador (sus bienes) |

## 8. Cuenta corriente y liquidaciones

| Código | Pantalla | Información y contenido | Acciones | Roles |
| --- | --- | --- | --- | --- |
| P-32 | Cuenta corriente | Por propietario, con selector ARS / USD: fecha, bien, tipo, descripción, debe, haber, saldo acumulado y comprobante. Filtros por bien y fechas. | Nuevo movimiento manual, Traspaso ARS/USD, Exportar. | Administrador; Operador (consulta); Propietario (la suya) |
| P-33 | Movimiento manual | Tipo (depósito, transferencia, gasto extraordinario, ajuste), bien, moneda, fecha, importe, descripción, comprobante. En traspasos: importes de origen y destino y tipo de cambio. | Guardar, Anular. | Administrador |
| P-34 | Resumen de depósito | Por propietario: obligaciones pendientes a su cargo hasta la fecha límite, saldo disponible y monto a depositar, por moneda. Aparte, gastos a confirmar (A completar) y posibles obligaciones sin vencimiento, que no se suman. Datos para el depósito y vista previa del mensaje. | Elegir horizonte (7, 15 o 30 días, fin de mes o fecha a elección), Descargar PDF, Compartir por WhatsApp (app), Enviar por email. | Administrador, Operador, Propietario |
| P-35 | Liquidaciones | Listado: propietario, período, saldo por moneda, estado (borrador, emitida, enviada, reabierta), fecha de envío. | Generar una o todas las del período (generación masiva), Abrir, Filtrar. | Administrador; Propietario (las suyas) |
| P-36 | Detalle de liquidación | Vista previa: detalle por bien, total por moneda, movimientos directos informativos, pendientes y monto a depositar. | Emitir, Enviar por email, Compartir por WhatsApp (app), Descargar PDF, Reabrir (solo la última). | Administrador |

## 9. Reportes e IPC

| Código | Pantalla | Información y contenido | Acciones | Roles |
| --- | --- | --- | --- | --- |
| P-37 | Reportes | Catálogo: historial de pagos, evolución del canon, cuenta corriente entre fechas, gastos por bien y concepto, honorarios del período y deuda de inquilinos. Cada reporte con sus filtros. | Generar, Exportar a Excel o PDF. | Administrador, Operador |
| P-38 | IPC | Tabla histórica: período, variación mensual, acumulado del año, interanual, fuente y fecha de importación. | Importar del INDEC, Carga manual (si falla la importación). | Administrador; Operador y Propietario (consulta) |

## 10. Configuración y cuenta

| Código | Pantalla | Información y contenido | Acciones | Roles |
| --- | --- | --- | --- | --- |
| P-39 | Configuración (menú) | Accesos a las pantallas siguientes. | Navegar. | Administrador |
| P-40 | Datos de la administración | Nombre, logo (encabeza los PDF y la firma de los emails), CUIT, contacto, cuenta para depósitos de los propietarios y email de envío. | Subir logo, Quitar logo, Guardar. | Administrador |
| P-41 | Usuarios y roles | Listado: nombre, email, roles, bienes asignados, estado, último acceso. Solicitudes de registro pendientes. Ficha con edición de roles y asignaciones. | Invitar, Aprobar o rechazar solicitudes, Editar, Desactivar, Reenviar invitación, Generar código provisorio de contraseña. | Administrador; Operador (solo usuarios Propietario) |
| P-42 | Catálogo de conceptos | Nombre, categoría, estado. | Nuevo, Editar, Desactivar. | Administrador |
| P-43 | Preferencias generales | Política de doble factor (desactivado, opcional u obligatorio), registro abierto (habilitado o no), idioma por defecto del sistema, moneda por defecto, días de aviso (60 y 30), días previos a fin de mes para pedir los montos de gastos recurrentes (por defecto 5), tamaño máximo de archivos. | Guardar. | Administrador |
| P-44 | Sincronización y datos | Modo actual (local o nube), último sincronizado, cambios pendientes de subir, errores. Respaldo y restauración en modo local, con recordatorio mensual. | Sincronizar ahora, Migrar a la nube, Exportar respaldo, Restaurar. | Administrador |
| P-45 | Auditoría | Registro de cambios: fecha, usuario, objeto, acción, valores antes y después. Filtros por usuario, objeto y fechas. | Filtrar, Exportar. | Administrador; Operador (sus bienes) |
| P-46 | Mi cuenta | Nombre, avatar (el de su ficha, si es propietario), email, teléfono, cambio de contraseña, doble factor, canal de notificaciones, apariencia (claro, oscuro o automático según el dispositivo), idioma (español, inglés o portugués), cerrar sesión. | Guardar, Activar 2FA, Cerrar sesión. | Todos |
| P-47 | Acerca de | Versión de la app, versión de la base, novedades, contacto de soporte. | Ninguna. | Todos |
| P-49 | Plantillas de envío | Textos de email (asunto y cuerpo) y de WhatsApp de cada PDF, por idioma (ES, EN, PT). Lista de datos disponibles entre llaves para insertar y vista previa con datos de ejemplo. | Editar, Insertar dato, Vista previa, Restaurar texto original, Guardar. | Administrador |

## 11. Definiciones resueltas

- Resuelto: el resumen de depósito se comparte por PDF, WhatsApp o email.
- Resuelto: la foto de la boleta solo se adjunta; no hay lectura automática.
- Diseño visual: logo definido (Mosaico: cuatro piezas, azul #1F3A5F con una pieza ámbar #E8A33D). Colores y tipografía en la sección 12.

## 12. Sistema visual: modo claro y modo oscuro

Definido el 13/10/2026. Toda pantalla usa estos tokens de color, nunca colores sueltos, para que el cambio de modo sea completo.

- **Cambio de modo:** botón con ícono de luna (pasa a oscuro) o sol (pasa a claro) en la barra superior de la web, en el encabezado de la app y en la pantalla de ingreso. La elección se guarda por usuario; en Mi cuenta (P-46) puede elegirse también Automático, que sigue la configuración del dispositivo.
- **Tipografía:** Source Serif 4 para títulos e importes destacados (600 en claro, 500 en oscuro) e IBM Plex Sans para el resto, con cifras tabulares.
- **Dos logos:** el logo de la aplicación (Mosaico) identifica a Administración Inteligente: ícono de la app, pantalla de inicio, ingreso, menú lateral y pie de los PDF ("Generado por Administración Inteligente"). El logo de la administración lo sube el administrador en P-40 y encabeza los PDF y la firma de los emails; también se muestra en el inicio del propietario. Sin logo cargado, se muestra solo el nombre de la administración.
- **Avatares:** propietarios e inquilinos pueden tener una foto o imagen, opcional, que se sube desde su ficha o se toma con la cámara en la app. Se recorta en cuadrado y se muestra en círculo. Sin imagen, se muestran sus iniciales sobre un color fijo derivado del nombre. Aparece en listados, fichas, buscador, cobros y en Mi cuenta del usuario vinculado.

| Token | Uso | Claro | Oscuro |
| --- | --- | --- | --- |
| bg | Fondo general | #F3F5F8 | #12171D |
| surface | Tarjetas, paneles, campos | #FFFFFF | #1A2129 |
| surface2 | Destacado, hover, pie de tabla | #F8FAFC | #222B35 |
| sidebar | Menú lateral | #18212B | #0D1116 |
| sidebarActive | Ítem activo del menú | #2C3846 | #222B35 |
| line | Bordes | #D8DEE6 | #2E3843 |
| lineSoft | Separadores internos | #ECF0F4 | #252E38 |
| inputLine | Borde de campos y botones secundarios | #C5CDD8 | #3A4552 |
| text | Texto principal | #18212B | #E8ECEF |
| muted | Texto secundario | #55606B | #9AA6B2 |
| accent | Color principal, enlaces, activo | #1F3A5F (azul del logo) | #8DB4E6 |
| highlight | Destacado: pieza del logo, aviso de recurrentes A completar, marcas puntuales | #E8A33D | #F0B85A |
| onAccent | Texto sobre el color principal | #FFFFFF | #0E1A2B |
| danger / dangerBg | Vencida | #8A1F14 sobre #F9E3E0 | #F2948A sobre #3A1F1C |
| neutral / neutralBg | Pendiente | #3D4752 sobre #ECF0F4 | #C3CBD3 sobre #2A333D |
| ok / okBg | Pagada, Alquilado | #14453A sobre #E3EEEA | #7DD3B2 sobre #17332A |
| warn | Atención (sin cobrar) | #8A4B00 | #E8B460 |
| warnBg / warnLine | Panel de advertencias | #FBF3E4 / #EBD3A6 | #2B2214 / #5A4420 |

Reglas: sin negro ni blanco puros en oscuro; las superficies se aclaran a medida que suben de nivel; la separación entre capas la dan bordes y tonos, no sombras; todo texto cumple contraste 4,5:1 y cada estado conserva su etiqueta escrita además del color.

## 13. Idiomas

Definido el 13/10/2026. Hay dos idiomas independientes, ambos con las mismas tres opciones: español (Argentina, por defecto), inglés y portugués (Brasil). El inglés y el portugués se incorporan una vez que la versión 1.0 en español esté funcionando; hasta entonces los selectores de idioma quedan ocultos.

| Idioma | Qué alcanza | Dónde se define | Valor por defecto |
| --- | --- | --- | --- |
| Idioma de la aplicación | Lo que ve cada usuario en la web y la app | Por usuario: botón del encabezado y Mi cuenta (P-46) | El idioma del sistema (P-43) |
| Idioma de informes | Lo que se envía a propietarios e inquilinos: liquidaciones, resúmenes de depósito, recibos, avisos y emails | Campo de la ficha del propietario y del inquilino | Al crearlos, el idioma del sistema; luego editable |

Ejemplo: un administrador trabaja la app en español y emite la liquidación de un propietario con idioma de informes portugués; el PDF y el email salen en portugués.

- **Cambio del idioma de la aplicación:** botón con ícono de globo y el código del idioma (ES, EN, PT) junto al botón de modo claro u oscuro, en la web, en la app y en la pantalla de ingreso. Cada toque pasa al idioma siguiente. La elección se guarda por usuario y también puede cambiarse en Mi cuenta (P-46); el administrador fija el idioma por defecto en P-43.
- **Qué se traduce:** todos los textos del sistema (menús, títulos, botones, etiquetas, estados, mensajes, avisos y notificaciones) y los nombres del catálogo inicial de conceptos.
- **Qué no se traduce:** los datos cargados por los usuarios: nombres de propietarios e inquilinos, alias, direcciones y dominios de bienes, empresas prestadoras, descripciones y observaciones.
- **Formatos según idioma:** importes con el separador de cada idioma ($ 41.300 en español, ARS 41,300 en inglés, ARS 41.300 en portugués) y fechas en el orden local. La moneda nunca cambia: siempre ARS o USD según la operación.
- **Implementación:** archivos de textos por idioma (es-AR, en-US, pt-BR) con las mismas claves; ningún texto escrito directamente en las pantallas. Una clave faltante muestra el texto en español.
- **Informes:** se generan siempre en el idioma de informes del destinatario (PRO-10, INQ-05). Antes de enviar, la vista previa indica en qué idioma saldrá el documento.
