# Textos de envío

Cada PDF sale acompañado de un texto fijo, que el sistema completa con los datos entre llaves. El texto se envía en el idioma de informes del destinatario. Abajo está la versión en español; las versiones en inglés y portugués se traducen de esta cuando la versión 1.0 en español esté funcionando. El trato es de usted.

## Datos que completa el sistema

| Dato | Contenido | Ejemplo |
| --- | --- | --- |
| {nombre} | Nombre del propietario o inquilino | Carlos |
| {administracion} | Nombre de la administración | \[Nombre de la administración\] |
| {numero} | Número del PDF | LIQ-2026-0001 |
| {periodo} | Mes y año | octubre 2026 |
| {bien} | Alias del bien | Depto Centro 3B |
| {monto} | Importe, por moneda si hay más de una | $ 131.050 |
| {fecha\_limite} | Fecha hasta la que se calcula el depósito | 12/11/2026 |
| {resultado} | Saldo a transferir o monto a depositar, según corresponda | Saldo disponible para transferir: $ 458.540 |
| {datos\_deposito} | Banco, titular, CBU y alias de la cuenta de la administración | Banco \[X\] · CBU \[22 dígitos\] · Alias \[alias\] |

## Liquidación al propietario

**Email.** Asunto: Liquidación {periodo} · {numero}

> Estimado/a {nombre}:
>
> Le enviamos adjunta la liquidación de {periodo}, con el detalle de los ingresos y egresos de sus bienes.
>
> {resultado}.
>
> Ante cualquier consulta, puede responder este correo.
>
> Saludos cordiales, {administracion}

**WhatsApp.**

> Hola {nombre}, le enviamos la liquidación de {periodo} ({numero}). {resultado}. Ante cualquier consulta, quedamos a disposición. {administracion}

## Resumen de depósito

**Email.** Asunto: Monto a depositar hasta el {fecha\_limite} · {numero}

> Estimado/a {nombre}:
>
> Para cubrir los impuestos y servicios a su cargo que vencen hasta el {fecha\_limite}, el monto a depositar es {monto}. Adjuntamos el detalle.
>
> Datos para el depósito: {datos\_deposito}
>
> Una vez realizado el depósito, le pedimos que responda este correo con el comprobante.
>
> Saludos cordiales, {administracion}

**WhatsApp.**

> Hola {nombre}, el monto a depositar para cubrir los vencimientos hasta el {fecha\_limite} es {monto}. Le enviamos el detalle con los datos de la cuenta. Cuando deposite, envíenos el comprobante por aquí. Muchas gracias. {administracion}

## Recibo de alquiler

**Email.** Asunto: Recibo de alquiler {periodo} · {bien} · {numero}

> Estimado/a {nombre}:
>
> Adjuntamos el recibo {numero} por su pago de {monto}, correspondiente al alquiler de {periodo} de {bien}.
>
> Muchas gracias.
>
> Saludos cordiales, {administracion}

**WhatsApp.**

> Hola {nombre}, recibimos su pago de {monto} por el alquiler de {periodo} de {bien}. Le enviamos el recibo {numero}. Muchas gracias. {administracion}

## Reglas de envío

- El email sale desde la cuenta de envío configurada, con la dirección de la administración para las respuestas.
- En WhatsApp, la app abre la conversación con el texto y el PDF adjunto; el usuario confirma el envío desde su teléfono.
- Antes de enviar se puede corregir el texto de ese envío; la plantilla no cambia.
- Si el destinatario no tiene email o teléfono cargado, la opción correspondiente aparece deshabilitada con el motivo.
- Cada envío queda registrado con fecha, canal y usuario.
- El administrador edita estas plantillas en Configuración (P-49 Plantillas de envío), por documento, canal e idioma. Puede insertar los datos entre llaves, ver una vista previa y restaurar el texto original. Los textos de esta página son los que trae el sistema por defecto.
