# Flujos y escenarios

## Introducción

Cada proceso se recorre de principio a fin para comprobar que todo camino posible termina en un resultado definido por una regla del diccionario de datos. Los escenarios se clasifican así:

- **Normal:** el camino habitual.
- **Alternativo:** un camino válido pero menos frecuente.
- **Error:** una carga incorrecta o una falla técnica que el sistema debe detectar y resolver.

La columna Regla indica la regla que resuelve cada escenario. Donde dice **VACÍO**, hoy no hay regla definida: esos casos se reúnen al final. Ya fueron resueltos: cada uno indica ahora la regla que lo resuelve (V1 → OBL-07).

## 1. Obligación y pago

&#91;embedded content: flujo 1 · obligación y pago\]

El responsable se decide al generar la obligación; el impacto contable, al registrar el pago, según quién pagó.

| # | Escenario | Tipo | Resultado esperado | Regla |
| --- | --- | --- | --- | --- |
| 1.1 | El servicio mensual genera la obligación del próximo mes | Normal | Se crea A completar, sin monto ni vencimiento, con el responsable de la matriz; el monto estimado se muestra como referencia | OBL-05, SERV-03 |
| 1.2 | Llega la boleta con otro monto | Normal | Se cargan el monto y el vencimiento; pasa a Pendiente | OBL-05 |
| 1.3 | Gasto suelto (reparación) | Alternativo | Obligación con concepto Otro y descripción obligatoria | OBL-04 |
| 1.4 | Bien sin contrato vigente | Alternativo | El responsable es el propietario | RN-01 |
| 1.5 | Pasa el vencimiento sin pago | Normal | Pasa a Vencida; aparece en el tablero y se notifica | RN-04 |
| 1.6 | Obligación sin fecha de vencimiento | Alternativo | Queda Pendiente, ordenada por período; en el resumen de depósito figura aparte como posible obligación a pagar | OBL-02 · **V1 → OBL-07** |
| 1.7 | La administración paga una obligación del propietario | Normal | Débito en su cuenta corriente | PAG-04 |
| 1.8 | La administración paga una obligación del inquilino | Alternativo | Deuda del inquilino; se suma a su próximo cobro | PAG-04, COB-04 |
| 1.9 | El propietario o el inquilino pagan directo | Alternativo | Pagada, solo historial | RN-13 |
| 1.10 | Se paga algo que no estaba cargado | Alternativo | Se crea la obligación ya pagada | PAG-02 |
| 1.11 | El importe pagado difiere del monto | Error | Se pide confirmación y motivo; la diferencia queda registrada | PAG-01 · **V2 → PAG-01** |
| 1.12 | Se intenta pagar dos veces la misma obligación | Error | Rechazado: ya está Pagada | PAG-01 |
| 1.13 | La administración paga sin saldo suficiente del propietario | Alternativo | Se permite con advertencia; el saldo deudor se suma al monto a depositar | **V3 → MOV-07** |
| 1.14 | Se anula un pago | Error | Contramovimiento; la obligación vuelve a Pendiente o Vencida | PAG-05 |
| 1.15 | Se anula un pago de un período ya liquidado | Error | Rechazado; la corrección va al período abierto | PAG-06 |
| 1.16 | Hay obligaciones a cargo del inquilino con período posterior al fin del contrato | Alternativo | Conservan el responsable inquilino; no se reasignan | RES-03 · **V4 → se mantiene** |
| 1.17 | Se carga un gasto marcado como recurrente | Normal | Se genera el del período siguiente A completar, sin monto | OBL-05, OBL-09 |
| 1.18 | Fin de mes con gastos sin monto | Normal | Al ingresar aparece la ventana para cargar montos y vencimientos; se puede posponer | OBL-08 |
| 1.19 | Llega el mes y un gasto sigue sin monto | Alternativo | No suma al monto a depositar; figura "a confirmar" y la ventana sigue apareciendo | OBL-11 |
| 1.20 | Un gasto deja de repetirse | Alternativo | Se quita la marca; se elimina la ocurrencia futura sin monto | OBL-10 |
| 1.21 | Gasto general del propietario (pago a una persona, lavado de auto) | Normal | Se carga en su bien Gastos varios y se debita de su cuenta corriente | PROP-06, PROP-07 |
| 1.22 | Gasto de un vehículo (patente, verificación) | Normal | Se carga en el vehículo como en cualquier bien | PROP-08 |
| 1.23 | Se paga un gasto A completar sin haber cargado el monto | Alternativo | El importe pagado completa su monto y queda Pagada | OBL-11 |

## 2. Cobro de alquiler

&#91;embedded content: flujo 2 · cobro de alquiler\]

El cobro directo deja el período cobrado pero no toca la cuenta corriente ni la deuda del inquilino.

| # | Escenario | Tipo | Resultado esperado | Regla |
| --- | --- | --- | --- | --- |
| 2.1 | Se cobra el mes por la administración | Normal | Crédito al propietario, repartido según el condominio | COB-03, CON-02 |
| 2.2 | El inquilino paga directo al propietario | Alternativo | Período cobrado, solo historial | COB-03 |
| 2.3 | Hay gastos adelantados al inquilino | Alternativo | Se suman al cobro y cancelan su deuda; no se acreditan al propietario | COB-04 |
| 2.4 | Hay gastos adelantados y el cobro es directo | Alternativo | La deuda sigue pendiente y se cobra aparte | COB-05 |
| 2.5 | Cobro fuera de término | Alternativo | Punitorios cargados a mano | CTR-03 |
| 2.6 | Bonificación acordada | Alternativo | Se resta del total con motivo | Diccionario 12 |
| 2.7 | Tramo de canon incompleto | Error | No se puede cobrar; advertencia en el tablero | CAN-02, COB-02 |
| 2.8 | Se intenta cobrar dos veces el mismo período | Error | Rechazado: un cobro por contrato y período | COB-01 |
| 2.9 | El inquilino paga solo una parte | Alternativo | No se admite: el inquilino debe pagar la totalidad | COB-01 · **V5 → COB-08** |
| 2.10 | Contrato en dólares pagado en pesos | Alternativo | En cada cobro se elige: cuenta en dólares con tipo de cambio, o cuenta en pesos | **V6 → COB-09** |
| 2.11 | Se anula un cobro | Error | Contramovimiento; el recibo queda anulado, no se borra | COB-06, COB-07 |
| 2.12 | No se sabe si un mes está en mora | Alternativo | Con el día de vencimiento opcional del contrato se marca En mora; sin él solo se ve "sin cobrar", no "en mora" | CTR-03 · **V8 → CTR-08** |
| 2.13 | Rescisión a mitad de mes | Alternativo | Se cobra el mes completo, sin prorrateo | **V9 → CTR-09** |

## 3. Liquidación y monto a depositar

&#91;embedded content: flujo 3 · liquidación y monto a depositar\]

Mientras es borrador se recalcula sola; al emitirla se congela y cierra el período.

| # | Escenario | Tipo | Resultado esperado | Regla |
| --- | --- | --- | --- | --- |
| 3.1 | Liquidación mensual de un propietario | Normal | Borrador, revisión, emisión y envío | LIQ-01, LIQ-02 |
| 3.2 | Generación de todas las del período | Alternativo | Borradores masivos; cada una se emite por separado | LIQ-06 |
| 3.3 | Propietario con cuentas en pesos y en dólares | Normal | Totales y monto a depositar por moneda, sin compensar | RN-14, 4.5 |
| 3.4 | Saldo disponible mayor que los pendientes | Normal | Monto a depositar cero; se informa el saldo a transferir | 4.5 |
| 3.5 | Condominio por separado | Alternativo | Una liquidación por titular según su reparto | CON-02 |
| 3.6 | Condominio al representante | Alternativo | Una sola liquidación, en el idioma del representante | CON-04, PRO-10 |
| 3.7 | Honorarios porcentuales en un condominio | Alternativo | Según lo definido en el bien: sobre la parte de cada titular o sobre el total, a cargo del representante | **V10 → CON-06** |
| 3.8 | Propietario sin acuerdo de honorarios vigente | Alternativo | No se liquidan honorarios | Diccionario 1 |
| 3.9 | Error detectado en la última liquidación emitida | Error | El administrador la reabre; la versión anterior queda en auditoría | LIQ-03 |
| 3.10 | Error en una liquidación anterior a la última | Error | Se corrige con un ajuste en el período abierto | RN-12 |
| 3.11 | Se reabre una liquidación cuyo saldo ya fue transferido | Error | La transferencia queda registrada; la diferencia aparece en la nueva emisión | MOV-06, LIQ-03 |
| 3.12 | El email del propietario rebota o el envío falla | Error | Se registra el estado del envío, se avisa al administrador y se puede reintentar | **V11 → LIQ-07** |
| 3.13 | Períodos superpuestos | Error | Rechazado | LIQ-05 |
| 3.14 | Propietario con fondo de reserva | Alternativo | El monto a depositar incluye la reposición del fondo cuando el saldo cae por debajo | PRO-09 |
| 3.15 | Envío del resumen o la liquidación | Normal | Sale con la plantilla del documento y canal, en el idioma de informes del destinatario, y queda registrado | PRO-10, PLA-01, ENV-01 |

## 4. Ciclo del contrato

| # | Escenario | Tipo | Resultado esperado | Regla |
| --- | --- | --- | --- | --- |
| 4.1 | Alta en un bien sin contrato vigente | Normal | Se crea con la matriz precargada y el primer tramo con el canon inicial | CTR-02, RES-01 |
| 4.2 | Alta con otro contrato vigente en el mismo bien | Error | Rechazado | CTR-02 |
| 4.3 | Contrato sin fechas | Alternativo | Vigente hasta que se rescinda o se cargue la fecha de fin | CTR-02 |
| 4.4 | Tramos futuros escalonados | Alternativo | Cada uno se aplica al llegar su mes | CAN-03, CAN-04 |
| 4.5 | Ajuste del canon | Normal | Nuevo tramo cargado a mano; % de variación e IPC solo informativos | RN-09 |
| 4.6 | Cambio de un tramo ya aplicado a cobros | Error | Rechazado; se corrige con un tramo nuevo | CAN-05 |
| 4.7 | Fin de contrato o ajuste próximo | Normal | Avisos a 60 y 30 días, si las fechas están cargadas | CTR-04 |
| 4.8 | El contrato vence y el inquilino sigue ocupando | Alternativo | Queda Finalizado; se avisa y se ofrece renovar o extender la fecha de fin | **V12 → CTR-10** |
| 4.9 | Renovación | Normal | Contrato nuevo enlazado que copia bien, inquilino, matriz y último canon | CTR-07 |
| 4.10 | Rescisión anticipada | Alternativo | Fecha y motivo; deja de generar alquileres | CTR-01 · **V9 → CTR-09** |
| 4.11 | El inquilino se va con deuda | Alternativo | La deuda queda en su ficha; se advierte al desactivarlo | INQ-03 |
| 4.12 | El estado del bien no coincide con el contrato | Error | Advertencia de inconsistencia | PROP-02 |
| 4.13 | Se intenta eliminar un contrato con cobros | Error | Rechazado; solo se rescinde | CTR-06 |
| 4.14 | Cambio de quién paga qué con el contrato vigente | Alternativo | Afecta solo las obligaciones que se generen desde entonces | RES-03 |
| 4.15 | Contrato de alquiler sobre un terreno | Alternativo | Se permite, igual que en un inmueble | PROP-08 |

## 5. Acceso y trabajo sin conexión

| # | Escenario | Tipo | Resultado esperado | Regla |
| --- | --- | --- | --- | --- |
| 5.1 | Ingreso con email y contraseña | Normal | Acceso según sus roles | USU-06 |
| 5.2 | Activación por invitación | Normal | Define su contraseña y entra | P-03 |
| 5.3 | Registro abierto | Alternativo | Queda Pendiente, sin acceso, hasta la aprobación | USU-08 |
| 5.4 | Olvido de contraseña | Alternativo | Enlace al email, código por SMS o código provisorio del administrador, de un solo uso | USU-10 |
| 5.5 | Usuario desactivado intenta ingresar | Error | Acceso denegado | USU-07 |
| 5.6 | El último administrador intenta quitarse el rol | Error | Rechazado | USU-02 |
| 5.7 | Un operador busca un bien no asignado | Error | No lo ve: lo filtra la base de datos | USU-04, SEG-02 |
| 5.8 | Carga sin conexión | Normal | Se guarda en el dispositivo y se sube al reconectar | 6.3 |
| 5.9 | El mismo dato se edita en dos dispositivos sin conexión | Alternativo | Gana la última versión de cada campo | 6.3 |
| 5.10 | Dos dispositivos sin conexión registran el pago de la misma obligación o el cobro del mismo período | Error | Al sincronizar, el segundo queda En conflicto, sin efecto contable, para revisión del administrador | **V7 → PAG-07** |
| 5.11 | Dos dispositivos sin conexión emiten recibos | Error | Número provisorio en el dispositivo; el definitivo se asigna al sincronizar | **V13 → COB-10** |
| 5.12 | Se marca la ubicación de un bien sin conexión | Alternativo | Se guarda la dirección; el mapa se usa al volver la conexión | PROP-09 |
| 5.13 | Un operador carga un gasto en Gastos varios de un propietario de sus bienes | Normal | Se permite: ve y carga el Gastos varios de esos propietarios | USU-04 |

## 6. Vacíos detectados y resolución

Resueltos el 13/10/2026. Los trece casos sin regla quedaron decididos e incorporados al diccionario de datos.

| Código | Vacío | Decisión | Regla |
| --- | --- | --- | --- |
| V1 | Obligación sin vencimiento en el resumen de depósito | Si está pagada, figura entre los pagos; si no, aparte como posible obligación a pagar | OBL-07 |
| V2 | Pago por un importe distinto del monto | Se pide confirmación y motivo; la diferencia queda registrada | PAG-01 |
| V3 | Pago sin saldo del propietario | Se permite con advertencia; el saldo deudor se suma al monto a depositar | MOV-07 |
| V4 | Obligaciones del inquilino posteriores al fin del contrato | No se reasignan: conservan su responsable | RES-03 |
| V5 | Pago parcial del alquiler | No se admite: el inquilino paga la totalidad | COB-08 |
| V6 | Contrato en dólares cobrado en pesos | Se elige en cada cobro: cuenta en dólares con tipo de cambio, o cuenta en pesos | COB-09 |
| V7 | Pagos o cobros duplicados sin conexión | El segundo queda En conflicto para revisión | PAG-07 |
| V8 | Mora sin día de vencimiento | Día de vencimiento opcional en el contrato, solo para alertas | CTR-08 |
| V9 | Rescisión a mitad de mes | Se cobra el mes completo | CTR-09 |
| V10 | Honorarios porcentuales en condominio | Se define en cada bien en condominio | CON-06 |
| V11 | Envío fallido o rebotado | Estado del envío, aviso al administrador y reintento | LIQ-07 |
| V12 | Ocupación después del fin del contrato | Aviso y oferta de renovar o extender | CTR-10 |
| V13 | Numeración de recibos sin conexión | Número provisorio; definitivo al sincronizar | COB-10 |
