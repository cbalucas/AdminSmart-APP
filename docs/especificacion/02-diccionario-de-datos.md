# Diccionario de datos

Detalle de campos y reglas de cada objeto, validado uno por uno. Los campos de auditoría (id, alta, modificación, baja lógica, versión) se aplican a todos y no se repiten.

## 1. Propietario

Validado el 13/10/2026. Se excluyen documento, CUIT/CUIL, condición frente al IVA y domicilios.

| Campo | Tipo | Obligatorio | Observación |
| --- | --- | --- | --- |
| tipo\_persona | Humana / Jurídica | Sí | Por defecto: Humana. |
| nombre\_razon\_social | Texto | Sí | Apellido y nombre, o razón social si es jurídica. |
| telefonos | Lista (tipo, número) | Sí | Al menos uno. |
| emails | Lista, uno principal | Sí | El principal recibe resúmenes y liquidaciones. |
| estado | Activo / Inactivo | Sí | Por defecto: Activo. |
| apoderado | Nombre y contacto | No | Contacto alternativo. |
| cuentas\_bancarias | Vínculo a cuenta bancaria (1.1) | No | Puede tener varias. |
| acuerdo\_honorarios | Lista con vigencia (1.2) | No | Sin acuerdo vigente no se liquidan honorarios. |
| periodicidad\_liquidacion | Mensual u otra; día | No | Por defecto: mensual. |
| horizonte\_resumen | Días | No | Por defecto: 30. |
| fondo\_reserva | Monto por moneda | No | Saldo que retiene la administración. |
| usuario\_id | Vínculo a usuario | No | Solo si accede a la aplicación. |
| idioma\_informes | Español / Inglés / Portugués | Sí | Idioma de liquidaciones, resúmenes y emails que recibe. Al crearlo toma el idioma del sistema; editable. |
| avatar | Imagen (JPG, PNG o WebP) | No | Foto o logo del propietario (PRO-12). Sin imagen, se muestran sus iniciales. |
| pago\_promedio | Calculado, por moneda | — | Promedio de los depósitos del propietario (PRO-11). Se muestra en su ficha. |
| observaciones | Texto | No |  |

### 1.1 Cuenta bancaria

Un propietario puede tener varias cuentas y una cuenta puede pertenecer a varios propietarios (relación N:M mediante `propietario_cuenta`).

| Campo | Tipo | Obligatorio | Observación |
| --- | --- | --- | --- |
| banco | Texto | Sí |  |
| tipo\_cuenta | Caja de ahorro / Cuenta corriente / Billetera | Sí |  |
| moneda | ARS / USD | Sí | Por defecto: ARS. |
| cbu\_cvu | Texto (22) | Sí | Validación de dígitos verificadores. |
| alias | Texto | No |  |
| titular | Texto | Sí | Como figura en el banco. |
| estado | Activa / Inactiva | Sí |  |
| propietario\_cuenta.predeterminada | Sí / No | Sí | Por propietario y por moneda. |

### 1.2 Acuerdo de honorarios

| Campo | Tipo | Obligatorio | Observación |
| --- | --- | --- | --- |
| modalidad | Porcentaje / Monto fijo | Sí |  |
| valor | Número | Sí | Porcentaje o importe. |
| moneda | ARS / USD | Sí, si es monto fijo |  |
| incluye\_cobros\_directos | Sí / No | Sí | Si el porcentaje alcanza los cobros directos al propietario. Por defecto: No. |
| vigente\_desde / vigente\_hasta | Fecha | Desde: sí | Hasta vacío = vigente. |

### 1.3 Reglas de negocio

- **PRO-01** Si se carga un propietario con un nombre o razón social ya existente, el sistema advierte y pide confirmación (no bloquea, ya que no se registra documento).
- **PRO-02** Solo puede darse de baja un propietario sin bienes activos (salvo su Gastos varios, que se da de baja junto con él), sin obligaciones pendientes a su cargo y con saldo cero en ambas monedas.
- **PRO-03** La baja es lógica: el historial se conserva y puede consultarse.
- **PRO-04** Debe haber exactamente un email principal.
- **PRO-05** Cada propietario tiene como máximo una cuenta predeterminada por moneda. Para transferirle saldo en una moneda se requiere esa cuenta; si no existe, la transferencia queda pendiente.
- **PRO-06** Una cuenta compartida por varios propietarios no puede eliminarse mientras tenga propietarios activos vinculados; solo puede desactivarse.
- **PRO-07** La cuenta corriente en USD se habilita automáticamente cuando el propietario tiene un contrato u obligación en dólares.
- **PRO-08** Los acuerdos de honorarios no se superponen en el tiempo; un cambio crea un nuevo acuerdo y no modifica períodos ya liquidados.
- **PRO-09** Si existe fondo de reserva, el resumen de depósito incluye su reposición cuando el saldo cae por debajo de ese monto.

* **PRO-10** Todo informe enviado al propietario (liquidación, resumen de depósito, avisos por email o WhatsApp) se genera en su idioma de informes, independientemente del idioma en que trabaje quien lo emite. En condominio con liquidación al representante, se usa el idioma del representante.

- **PRO-11** El pago promedio es el promedio mensual de los depósitos del propietario de los últimos 12 meses, por moneda, sin contar los ajustes. Se muestra en su ficha junto al saldo y al monto a depositar.
- **PRO-12** El avatar es opcional. Se sube desde la ficha o se toma con la cámara en la app, se recorta en cuadrado, se reduce a 512 px y se guarda en el almacenamiento de archivos. Sin imagen, se muestran las iniciales sobre un color fijo derivado del nombre. Si el propietario tiene usuario de acceso, el usuario ve el mismo avatar en Mi cuenta.

## 2. Usuario y roles

Validado el 13/10/2026. Roles del sistema: Administrador, Operador, Propietario e Inquilino (fase futura).

| Campo | Tipo | Obligatorio | Observación |
| --- | --- | --- | --- |
| nombre | Texto | Sí | Nombre y apellido. |
| email | Texto | Sí | Usuario de ingreso; único en el sistema. |
| roles | Lista: Administrador, Operador, Propietario, Inquilino | Sí | Uno o varios. |
| propietario\_id | Vínculo a propietario | Sí, si tiene rol Propietario |  |
| bienes\_asignados | Lista de bienes | Sí, si tiene rol Operador | El operador ve solo los asignados. |
| estado | Activo / Inactivo | Sí | Por defecto: Activo. |
| telefono | Texto | No |  |
| canal\_notificaciones | Push / Email | No | Por defecto: ambos. |
| idioma\_app | Español / Inglés / Portugués | No | Idioma de la aplicación para ese usuario. Por defecto: el del sistema. |
| apariencia | Claro / Oscuro / Automático | No | Por defecto: Automático, según el dispositivo. |
| doble\_factor | Sí / No | No | Según la política del administrador: desactivado (por defecto), opcional u obligatorio. |

### 2.1 Reglas de negocio

- **USU-01** El email es único: no puede haber dos usuarios con el mismo email.
- **USU-02** Debe existir siempre al menos un administrador activo; no se puede desactivar ni quitar el rol al último.
- **USU-03** Un usuario con rol Propietario debe estar vinculado a una ficha de propietario, y cada ficha admite un solo usuario.
- **USU-04** Un operador ve y opera únicamente los bienes asignados, y los propietarios, contratos y obligaciones de esos bienes. También ve y carga el bien Gastos varios de esos propietarios.
- **USU-05** Pueden dar de alta usuarios los administradores y los operadores. Un operador solo puede crear usuarios con rol Propietario (o Inquilino, en la fase futura), y vinculados a bienes que tenga asignados; asignar los roles Administrador u Operador es exclusivo del administrador.
- **USU-06** Los permisos de varios roles se suman.
- **USU-07** La baja de un usuario es lógica y no altera lo que registró: la auditoría conserva su autoría.

* **USU-08** Si el registro abierto está habilitado, la solicitud queda Pendiente y sin acceso hasta que un administrador la aprueba, le asigna rol y, si corresponde, la vincula a un propietario o a bienes.
* **USU-09** La política de doble factor la fija el administrador para todo el sistema: desactivado (por defecto), opcional por usuario u obligatorio para todos.
* **USU-10** La recuperación de contraseña se valida por enlace al email, código por SMS o código provisorio generado por el administrador, de un solo uso y con vencimiento.

## 3. Bien

Validado el 13/10/2026. Los servicios, impuestos y tasas no son campos del bien: se registran en una tabla aparte (3.2), sin límite de cantidad.

Actualizado el 14/10/2026. Todo lo que se administra es un **bien**, con un campo **tipo de bien**: **Inmueble** (casa, departamento, local, cochera, etc.), **Terreno**, **Vehículo** (con todos los gastos de su mantenimiento) u **Otros**. Cada propietario tiene un bien **Gastos varios**, de tipo Otros, que crea el sistema y que reúne los gastos que no corresponden a ningún otro bien: un pago mensual a una persona, un lavado de auto o cualquier gasto que luego se rinde al propietario. En las pantallas el listado se llama Bienes.

| Campo | Tipo | Obligatorio | Observación |
| --- | --- | --- | --- |
| tipo\_bien | Inmueble / Terreno / Vehículo / Otros | Sí | Define qué campos se piden. El bien Gastos varios es de tipo Otros y lo crea el sistema. |
| subtipo | Inmueble: Casa / Departamento / Local / Oficina / Cochera / Galpón / Otro · Vehículo: Auto / Moto / Camioneta / Otro | Sí, en inmuebles y vehículos |  |
| alias | Texto | Sí | Único. Ej.: "Depto Centro 3B", "Auto AI539LO". Gastos varios: "Gastos varios · \[Propietario\]". |
| direccion | Calle, número, piso, depto, localidad, provincia, CP | Sí, en inmuebles y terrenos | Se hereda del edificio si pertenece a uno. Botón Ver en Google Maps. |
| latitud, longitud | Coordenadas (grados decimales) | No | Inmuebles y terrenos. Se cargan marcando el punto en el mapa (PROP-09). |
| dominio | Texto (patente) | Sí, en vehículos | Único. Ej.: AI539LO. |
| marca\_modelo | Texto | No | Solo vehículos. |
| anio | Número | No | Solo vehículos. |
| estado | Inmueble y Terreno: Disponible / Alquilado / En refacción / Vendido · Vehículo: Activo / Vendido · Otros: Activo / De baja | Sí | Se modifica manualmente. |
| edificio\_id | Vínculo a edificio (3.1) | No | Solo inmuebles. |
| unidad\_funcional | Texto | No | Solo inmuebles. |
| fotos\_inventario | Archivos e inventario | No |  |
| observaciones | Texto | No |  |

### 3.1 Edificio o complejo

| Campo | Tipo | Obligatorio | Observación |
| --- | --- | --- | --- |
| nombre | Texto | Sí |  |
| direccion | Calle, número, localidad, provincia, CP | Sí | Común a sus unidades. |
| observaciones | Texto | No |  |

### 3.2 Servicios e impuestos del bien

Cada bien tiene una lista abierta de servicios, impuestos y tasas (luz, agua, gas, expensas, municipalidad, rentas u otros), tomados del catálogo de conceptos. Sus campos se validan en el punto siguiente.

### 3.3 Reglas de negocio

- **PROP-01** El alias es único en el sistema.
- **PROP-02** El estado se modifica manualmente. El sistema advierte las inconsistencias: estado Alquilado sin contrato vigente, o contrato vigente con estado Disponible.
- **PROP-03** No puede pasar a Vendido con obligaciones pendientes a cargo del propietario o con contrato vigente.
- **PROP-04** Un bien de tipo Inmueble dentro de un edificio hereda su dirección y agrega piso, departamento o unidad funcional.
- **PROP-05** La baja es lógica; el historial de obligaciones, pagos y contratos se conserva.

* **PROP-06** Al crear un propietario, el sistema crea su bien **Gastos varios**: uno por propietario, al 100 % de ese propietario, sin dirección, sin condominio y sin contratos. No puede eliminarse ni venderse; solo se desactiva junto con el propietario.
* **PROP-07** Gastos varios admite servicios recurrentes (por ejemplo, un pago mensual a una persona) y gastos sueltos, que se debitan de la cuenta corriente del propietario igual que los de cualquier otro bien y figuran en la liquidación como una sección propia.
* **PROP-08** Los contratos de alquiler solo pueden crearse para inmuebles y terrenos. Los vehículos llevan servicios e impuestos (Municipalidad y Rentas por la patente, seguro, verificación) y gastos sueltos de mantenimiento.
* **PROP-09** Ubicación: con coordenadas, el botón Ver en Google Maps abre el punto exacto; sin ellas, busca por la dirección. Marcar el punto en el mapa guarda las coordenadas y propone la dirección, que queda editable. Sin conexión se guarda la dirección y el mapa se usa al volver la conexión.

## 4. Servicios e impuestos del bien

Validado el 13/10/2026. Tabla `bien_servicio`: una fila por cada servicio, impuesto o tasa de un bien, sin límite de cantidad.

| Campo | Tipo | Obligatorio | Observación |
| --- | --- | --- | --- |
| bien\_id | Vínculo a bien | Sí |  |
| concepto\_id | Vínculo al catálogo (4.1) | Sí |  |
| nro\_cuenta\_cliente | Texto | Sí | Número de cuenta, cliente o partida. |
| empresa\_prestadora | Texto | Sí | Nombre de la empresa u organismo que presta el servicio o cobra el impuesto. Se sugieren los ya cargados. |
| responsable\_default | Propietario / Inquilino | Sí | Lo reemplaza la matriz del contrato vigente. |
| estado | Activo / Inactivo | Sí | Por defecto: Activo. |
| titular\_servicio | Texto | No | A nombre de quién está. |
| periodicidad | Mensual / Bimestral / Trimestral / Cuatrimestral / Semestral / Anual | No |  |
| dia\_vencimiento | Número (1 a 31) | No |  |
| monto\_estimado | Importe y moneda | No |  |
| debito\_automatico | Sí / No | No | Por defecto: No. |
| sitio\_boletas | URL | No | Nunca se guardan contraseñas. |
| observaciones | Texto | No |  |

### 4.1 Catálogo de conceptos

Catálogo inicial: Luz, Agua, Gas, Expensas, Municipalidad, Rentas, Internet/Televisión, Seguro, Verificación/VTV, Mantenimiento, Pileta/jardín y Otro (para gastos sueltos). Municipalidad y Rentas se usan también para los vehículos (patente). El administrador puede agregar otros.

| Campo | Tipo | Obligatorio | Observación |
| --- | --- | --- | --- |
| nombre | Texto | Sí | Único. |
| categoria | Servicio / Impuesto / Tasa / Expensa / Seguro / Otro | Sí | Para agrupar en reportes. |
| estado | Activo / Inactivo | Sí |  |

### 4.2 Reglas de negocio

- **SERV-01** Un concepto no puede repetirse en el mismo bien: la combinación bien + concepto es única entre los registros activos.
- **SERV-02** Si tiene periodicidad, sus obligaciones se cargan ya marcadas como recurrentes con esa frecuencia, y la generación sigue OBL-09; si no la tiene, las obligaciones se cargan a mano.
- **SERV-03** Al generar una obligación, el responsable se toma de la matriz del contrato vigente; si no hay contrato o el concepto no figura en ella, se usa el responsable por defecto.
- **SERV-04** Un servicio inactivo deja de generar obligaciones, pero conserva su historial.
- **SERV-05** Un concepto del catálogo en uso no puede eliminarse; solo desactivarse.

## 5. Condominio

Validado el 13/10/2026. El porcentaje de participación es la base de reparto por defecto, pero cada concepto puede repartirse de otra manera, incluso asumido por un solo propietario.

### 5.1 Titularidad (`bien_propietario`)

| Campo | Tipo | Obligatorio | Observación |
| --- | --- | --- | --- |
| bien\_id | Vínculo a bien | Sí |  |
| propietario\_id | Vínculo a propietario | Sí |  |
| porcentaje | Número (0 a 100) | Sí | Participación; base de reparto por defecto. |
| es\_representante | Sí / No | No | Contacto principal ante la administración. |
| observaciones | Texto | No |  |

En el bien se agrega `modo_liquidacion`: Por separado (cada condómino recibe su liquidación) o Al representante (una sola liquidación). Se define en cada bien.

### 5.2 Reparto por concepto (`reparto_concepto`)

Permite que un ingreso o gasto del bien se reparta distinto del porcentaje de titularidad.

| Campo | Tipo | Obligatorio | Observación |
| --- | --- | --- | --- |
| bien\_id | Vínculo a bien | Sí |  |
| concepto\_id | Concepto del catálogo, o Alquiler | Sí |  |
| modalidad | Según porcentaje / Un solo propietario / Personalizado | Sí |  |
| propietario\_id | Vínculo a propietario | Sí, si es Un solo propietario | Asume el 100 %. |
| porcentajes | Lista (propietario, %) | Sí, si es Personalizado |  |

### 5.3 Reglas de negocio

- **CON-01** Los porcentajes de titularidad de un bien suman 100 %. Un bien con un solo propietario tiene 100 % y no requiere reparto.
- **CON-02** Si un concepto no tiene regla de reparto, el importe se reparte según el porcentaje de titularidad.
- **CON-03** En modalidad Personalizado, los porcentajes del concepto suman 100 % y solo incluyen propietarios del bien.
- **CON-04** En modo Al representante es obligatorio designar exactamente un representante; todos los movimientos del bien se imputan a su cuenta corriente.
- **CON-05** No se lleva vigencia de titularidad: un cambio de titulares, porcentajes o reparto rige desde el período abierto y no altera períodos ya liquidados; la auditoría conserva la versión anterior.

* **CON-06** En un bien en condominio se define la modalidad de los honorarios porcentuales (campo `modo_honorarios` del bien): sobre la parte del alquiler de cada titular, con el acuerdo de cada uno, o sobre el total, a cargo del representante.

## 6. Inquilino

Validado el 13/10/2026. No se registran garantes ni domicilio u ocupación del inquilino.

| Campo | Tipo | Obligatorio | Observación |
| --- | --- | --- | --- |
| tipo\_persona | Humana / Jurídica | Sí | Por defecto: Humana. |
| nombre\_razon\_social | Texto | Sí |  |
| telefonos | Lista (tipo, número) | Sí | Al menos uno. |
| emails | Lista, uno principal | Sí | Al menos uno; recibe avisos y recibos. |
| estado | Activo / Inactivo | Sí | Por defecto: Activo. |
| documento | DNI o CUIT | No |  |
| idioma\_informes | Español / Inglés / Portugués | Sí | Idioma de recibos, avisos y emails que recibe. Al crearlo toma el idioma del sistema; editable. |
| avatar | Imagen (JPG, PNG o WebP) | No | Foto o logo del inquilino. Mismas reglas que PRO-12. |
| observaciones | Texto | No |  |

### 6.1 Reglas de negocio

- **INQ-01** Cada contrato tiene un único inquilino (sin co-locatarios). Un inquilino puede tener varios contratos, propios o sucesivos.
- **INQ-02** Si se carga el documento, no puede repetirse en otro inquilino; si no se carga, el sistema advierte cuando el nombre ya existe.
- **INQ-03** Solo puede desactivarse un inquilino sin contrato vigente; con deuda pendiente, el sistema advierte antes de hacerlo.
- **INQ-04** La baja es lógica; su historial de contratos, cobros y deudas se conserva.

* **INQ-05** Todo documento enviado al inquilino (recibo de alquiler, avisos de vencimiento, comunicaciones por email o WhatsApp) se genera en su idioma de informes.
* **INQ-06** El inquilino puede tener avatar con las mismas reglas que el propietario (PRO-12).

## 7. Contrato

Validado el 13/10/2026. El contrato es una tabla propia: cada contrato es una fila que vincula bien e inquilino. Así se conserva el historial completo de contratos por bien y por inquilino, cada uno con sus adjuntos, y no solo el actual y el anterior.

| Campo | Tipo | Obligatorio | Observación |
| --- | --- | --- | --- |
| bien\_id | Vínculo a bien | Sí |  |
| inquilino\_id | Vínculo a inquilino | Sí | Uno por contrato. |
| moneda | ARS / USD | Sí | Por defecto: ARS. |
| canon\_inicial | Importe | Sí | Crea el primer tramo de canon. |
| modalidad\_cobro | Administración / Directo al propietario | Sí | Por defecto para cada cobro; editable en cada uno. |
| fecha\_inicio / fecha\_fin | Fecha | No |  |
| periodicidad\_ajuste | Trimestral / Cuatrimestral / Semestral / Anual | No | Solo para avisos. |
| indice\_referencia | Texto | No | Solo como referencia. |
| rescision\_fecha / rescision\_motivo | Fecha y texto | No | Finaliza el contrato antes de su fin. |
| contrato\_anterior\_id | Vínculo a contrato | No | Opcional, para enlazar una renovación. |
| dia\_vencimiento | Número (1 a 31) | No | Solo para alertas de mora (CTR-08). |
| observaciones | Texto | No |  |

Los adjuntos (contrato firmado, addendas, inventario, actas) se guardan en la tabla de documentos: un contrato admite varios.

### 7.1 Reglas de negocio

- **CTR-01** El estado no se carga: se calcula. Un contrato está Vigente si no fue rescindido y la fecha actual está dentro de sus fechas (las que se hayan cargado); Finalizado si pasó su fecha de fin; Rescindido si tiene fecha de rescisión cumplida.
- **CTR-02** Un bien no puede tener dos contratos vigentes a la vez. Sin fecha de fin, el contrato sigue vigente hasta que se rescinda o se le cargue una fecha de fin.
- **CTR-03** Mientras el contrato esté vigente, los alquileres se generan mensualmente según el tramo de canon que corresponda; el día de vencimiento es opcional y solo genera alertas (CTR-08); no hay punitorios automáticos. Los punitorios, si los hay, se cargan a mano en el cobro.
- **CTR-04** Avisos a 60 y 30 días de la fecha de fin y del próximo ajuste, solo si esos datos están cargados.
- **CTR-05** El historial completo de contratos se consulta en el listado de contratos, filtrado por bien o por inquilino, del más reciente al más antiguo; las fichas tienen acceso directo a ese filtro.
- **CTR-06** Un contrato con cobros registrados no puede eliminarse; solo rescindirse.

* **CTR-07** Renovar crea un contrato nuevo, enlazado al anterior, que copia bien, inquilino, matriz de responsabilidad y último tramo de canon; el anterior debe estar finalizado o rescindido antes de que el nuevo quede vigente.

- **CTR-08** Si el contrato tiene día de vencimiento, un período sin cobrar pasado ese día figura como En mora en el tablero y genera aviso. No calcula punitorios.
- **CTR-09** Ante una rescisión a mitad de mes se cobra el mes completo; no hay prorrateo.
- **CTR-10** Al finalizar un contrato, si el bien sigue en estado Alquilado, el sistema avisa y ofrece renovar el contrato o extender su fecha de fin.

## 8. Canon (tramos)

Validado el 13/10/2026. Cada tramo es un período del alquiler con su monto; se admiten tramos futuros ya pactados (por ejemplo, escalonados).

| Campo | Tipo | Obligatorio | Observación |
| --- | --- | --- | --- |
| contrato\_id | Vínculo a contrato | Sí |  |
| vigente\_desde | Mes y año | No | Necesario para que el tramo se aplique. |
| monto | Importe | No | Necesario para que el tramo se aplique; en la moneda del contrato. |
| motivo | Inicial / Ajuste / Renegociación | No |  |
| observaciones | Texto | No |  |
| variacion\_pct | Calculado | — | % de aumento respecto del tramo anterior. |
| ipc\_periodo | Calculado | — | IPC acumulado desde el tramo anterior, para comparar. |

### 8.1 Reglas de negocio

- **CAN-01** El tramo usa siempre la moneda del contrato.
- **CAN-02** Un tramo sin fecha de inicio o sin monto queda incompleto: no se aplica a los alquileres y el sistema lo advierte en el tablero.
- **CAN-03** Los tramos completos de un contrato no se superponen; cada uno rige hasta el inicio del siguiente.
- **CAN-04** El alquiler de un mes toma el tramo vigente al primer día de ese mes.
- **CAN-05** Un tramo aplicado a cobros ya registrados no puede modificarse; se corrige con un nuevo tramo.

## 9. Matriz de responsabilidad

Validado el 13/10/2026. Define, para cada contrato, quién paga cada servicio o impuesto.

| Campo | Tipo | Obligatorio | Observación |
| --- | --- | --- | --- |
| contrato\_id | Vínculo a contrato | Sí |  |
| concepto\_id | Vínculo al catálogo | Sí |  |
| responsable | Propietario / Inquilino | Sí | Uno solo; no se comparte. |

### 9.1 Reglas de negocio

- **RES-01** Al crear el contrato, la matriz se precarga con los servicios activos del bien y su responsable por defecto; luego es editable.
- **RES-02** Cada concepto lo paga una sola parte: no hay porcentajes compartidos entre propietario e inquilino.
- **RES-03** Un cambio en la matriz afecta solo las obligaciones que se generen desde ese momento; las ya generadas conservan su responsable, salvo edición manual.
- **RES-04** Un servicio agregado al bien durante un contrato vigente se suma a la matriz con su responsable por defecto.

## 10. Obligación

Validado el 13/10/2026. Cada vencimiento concreto de un servicio o impuesto, o un gasto suelto del bien (inmueble, terreno, vehículo u otros, incluido Gastos varios).

| Campo | Tipo | Obligatorio | Observación |
| --- | --- | --- | --- |
| bien\_servicio\_id | Vínculo a servicio del bien | Sí | Salvo gastos sueltos, que llevan el bien (inmueble, terreno, vehículo u otros). |
| bien\_id | Vínculo a bien | Sí | Se toma del servicio; en gastos sueltos se elige. |
| concepto\_id | Vínculo al catálogo | Sí | Se toma del servicio; en gastos sueltos, Otro u otro concepto. |
| periodo | Mes y año | Sí |  |
| es\_recurrente | Sí / No | Sí | Por defecto: No. Viene marcado si el servicio tiene periodicidad. |
| frecuencia | Mensual / Bimestral / Trimestral / Cuatrimestral / Semestral / Anual | Sí, si es recurrente |  |
| monto | Importe | Sí, para pagarla | Vacío en las generadas por recurrencia hasta que llega la boleta. |
| moneda | ARS / USD | Sí | Por defecto: ARS. |
| responsable | Propietario / Inquilino | Sí | Se hereda de la matriz; editable. |
| vencimiento | Fecha | No | Se completa junto con el monto. |
| descripcion | Texto | Sí, en gastos sueltos | Ej.: "Reparación de calefón", "Pago mensual a July". |
| codigo\_pago | Texto | No | Pago Mis Cuentas, Link u otro. |
| boleta | Archivo (PDF o foto) | No |  |
| observaciones | Texto | No | Ej.: número de cuota (4/6). |
| estado | Calculado | — | A completar (sin monto), Pendiente, Vencida, Pagada, Anulada. |

### 10.1 Reglas de negocio

- **OBL-01** No hay segundo vencimiento ni opción de pago anual o en cuotas: cada boleta se registra como una obligación.
- **OBL-02** Solo puede estar Vencida una obligación con fecha de vencimiento; sin fecha queda Pendiente y se ordena por período.
- **OBL-03** Un mismo servicio del bien no puede tener dos obligaciones activas del mismo período.
- **OBL-04** Los gastos sueltos (reparaciones, arreglos) se cargan con el bien, el concepto Otro y una descripción obligatoria, sin servicio asociado.
- **OBL-05** Al cargar una obligación se indica si es recurrente y con qué frecuencia. Si lo es, el sistema genera la del período siguiente (el próximo mes, bimestre, trimestre, etc.) con los mismos datos pero sin monto ni vencimiento, en estado A completar.
- **OBL-06** Una obligación pagada no puede eliminarse ni modificarse; primero debe anularse su pago.

* **OBL-07** En el resumen de depósito, una obligación sin vencimiento: si está pagada figura entre los pagos; si no, figura aparte como posible obligación a pagar, con su monto, sin sumarse al monto a depositar.

- **OBL-08** En los últimos días de cada mes (por defecto 5, configurable), al ingresar al sistema aparece una ventana con las obligaciones del mes siguiente que siguen A completar, para cargar su monto y vencimiento. Se pueden completar todas, algunas o posponer; la ventana vuelve a aparecer en cada ingreso hasta que no quede ninguna. Si los montos se fueron cargando a medida que llegaban las boletas, la ventana no aparece.
- **OBL-09** Cada ocurrencia generada hereda la recurrencia: cuando su período comienza, genera a su vez la siguiente. Así cada gasto recurrente tiene siempre una sola ocurrencia futura.
- **OBL-10** Al quitar la marca de recurrente, se elimina la ocurrencia futura que siga A completar y no se generan más. Al cambiar la frecuencia, la ocurrencia futura se recalcula.
- **OBL-11** Una obligación A completar no suma al monto a depositar: en el resumen de depósito figura como "a confirmar", sin importe. Puede pagarse directamente; el importe pagado completa su monto.

## 11. Pago

Validado el 13/10/2026. Cada pago cancela una sola obligación por completo, en su misma moneda.

| Campo | Tipo | Obligatorio | Observación |
| --- | --- | --- | --- |
| fecha | Fecha | Sí |  |
| importe | Importe | Sí | En la moneda de la obligación. |
| pagado\_por | Administración / Propietario directo / Inquilino | Sí | Define si impacta la cuenta corriente. |
| obligacion\_id | Vínculo a obligación | No | Sin obligación previa, se registra como pago directo de un gasto (PAG-02). |
| medio | Transferencia / Efectivo / Débito automático / Tarjeta / Pago Mis Cuentas / Otro | No |  |
| nro\_operacion | Texto | No |  |
| comprobante | Archivo | No |  |
| observaciones | Texto | No |  |
| anulado, anulacion\_motivo, anulacion\_fecha, anulacion\_usuario | Sí/No, texto, fecha, usuario | Sí, al anular | El motivo es obligatorio para anular. |

### 11.1 Reglas de negocio

- **PAG-01** No hay pagos parciales ni pagos múltiples: un pago corresponde a una obligación y la deja Pagada. Si el importe difiere del monto (por ejemplo, por recargo), el sistema pide confirmación y motivo; la obligación toma el importe pagado como monto final y la diferencia queda registrada.
- **PAG-02** Un pago sin obligación previa exige bien, concepto, responsable y descripción; el sistema crea automáticamente la obligación ya pagada, para que el historial quede completo.
- **PAG-03** El pago se registra en la moneda de la obligación; no se admite otra moneda.
- **PAG-04** Impacto contable según quién pagó: Administración con obligación a cargo del propietario → débito en su cuenta corriente; Administración con obligación a cargo del inquilino → deuda del inquilino; Propietario directo o Inquilino → solo historial, sin movimiento.
- **PAG-05** Un pago no se borra: se anula con motivo obligatorio, se genera el contramovimiento y la obligación vuelve a Pendiente o Vencida.
- **PAG-06** No se puede anular un pago de un período ya liquidado; la corrección se registra en el período abierto.

* **PAG-07** Si dos dispositivos sin conexión registran el pago de la misma obligación, al sincronizar el servidor acepta el primero y deja el segundo En conflicto, sin efecto contable, hasta que el administrador lo revise. Igual criterio para dos cobros del mismo contrato y período.

## 12. Cobro de alquiler

Validado el 13/10/2026. Un cobro por contrato y por período, por el total.

| Campo | Tipo | Obligatorio | Observación |
| --- | --- | --- | --- |
| contrato\_id | Vínculo a contrato | Sí |  |
| periodo | Mes y año | Sí |  |
| fecha | Fecha | Sí |  |
| importe | Importe | Sí | Se propone el del tramo vigente; editable. En la moneda del contrato. |
| percibido\_por | Administración / Directo al propietario | Sí | Se propone el del contrato. |
| punitorios | Importe | No | Cargados a mano. |
| bonificacion | Importe y motivo | No | Se resta del total. |
| gastos\_recuperados | Importe | No | Gastos del inquilino que pagó la administración y se cobran con el alquiler (COB-04). |
| medio | Transferencia / Efectivo / Otro | No |  |
| recibo | PDF con número REC-AAAA-NNNN | No | Se emite a pedido. |
| comprobante | Archivo | No |  |
| observaciones | Texto | No |  |
| total | Calculado | — | Importe + punitorios − bonificación + gastos recuperados. |

### 12.1 Reglas de negocio

- **COB-01** No hay cobros parciales: un único cobro por contrato y período.
- **COB-02** Solo se pueden cobrar períodos dentro de la vigencia del contrato con un tramo de canon completo.
- **COB-03** Percibido por la administración: el alquiler, más punitorios y menos bonificación, se acredita en la cuenta corriente del propietario (o se reparte según el condominio). Directo al propietario: queda como historial, sin movimiento.
- **COB-04** Los gastos a cargo del inquilino que pagó la administración se suman al próximo cobro percibido por la administración; lo recuperado cancela la deuda del inquilino y no se acredita al propietario.
- **COB-05** Si el cobro es directo al propietario, los gastos del inquilino no se suman: su deuda sigue pendiente y se cobra aparte.
- **COB-06** La numeración de recibos es correlativa por año (REC-AAAA-NNNN) y no se reutiliza; un recibo de un cobro anulado queda anulado, no se borra.
- **COB-07** El cobro se anula con motivo obligatorio y contramovimiento; no se anulan cobros de períodos ya liquidados.

* **COB-08** El inquilino debe pagar la totalidad del período: el importe del cobro debe cubrir el total y no se registran pagos parciales del alquiler.
* **COB-09** En un contrato en dólares cobrado en pesos, al registrar el cobro el administrador elige: acreditar el equivalente en la cuenta en dólares, con el tipo de cambio aplicado, o acreditar lo recibido en la cuenta en pesos. Se guardan el importe recibido, la moneda y el tipo de cambio.
* **COB-10** Un recibo emitido sin conexión lleva número provisorio; el número correlativo definitivo se asigna al sincronizar.

## 13. Movimiento (cuenta corriente)

Validado el 13/10/2026. Libro de la cuenta corriente de cada propietario, por moneda. La mayoría de los movimientos los genera el sistema; el administrador puede cargar los manuales.

| Campo | Tipo | Obligatorio | Observación |
| --- | --- | --- | --- |
| propietario\_id | Vínculo a propietario | Sí |  |
| bien\_id | Vínculo a bien | Sí | También en los manuales. |
| moneda | ARS / USD | Sí |  |
| fecha | Fecha | Sí |  |
| tipo | Ver lista abajo | Sí |  |
| debe / haber | Importe | Sí | Uno de los dos. |
| descripcion | Texto | Sí |  |
| origen\_tipo / origen\_id | Pago / Cobro / Honorario / Manual | Sí | Lo completa el sistema. |
| comprobante | Archivo | No |  |
| liquidacion\_id | Vínculo a liquidación | — | Se completa al emitir. |

**Tipos automáticos:** Alquiler percibido (haber), Pago de obligación (debe), Honorarios (debe), Contramovimiento por anulación.

**Tipos manuales:** Depósito del propietario (haber), Transferencia al propietario (debe), Gasto extraordinario (debe), Ajuste manual (debe o haber), Traspaso entre pesos y dólares.

### 13.1 Reglas de negocio

- **MOV-01** El saldo nunca se guarda: es la suma de haber menos debe de los movimientos no anulados, por propietario y moneda (y por bien, si se filtra).
- **MOV-02** Los movimientos automáticos no se editan: se corrigen anulando su origen (pago o cobro).
- **MOV-03** Los movimientos manuales exigen bien y descripción; solo el administrador puede cargarlos y anularlos.
- **MOV-04** Un traspaso de moneda genera dos movimientos enlazados: un débito en la moneda de origen y un crédito en la de destino, con el tipo de cambio aplicado.
- **MOV-05** Una transferencia al propietario no puede superar su saldo disponible en esa moneda, salvo confirmación expresa del administrador.
- **MOV-06** Ningún movimiento de un período liquidado puede anularse mientras la liquidación esté emitida.

* **MOV-07** La administración puede pagar con fondos propios una obligación de un propietario sin saldo suficiente: el sistema advierte, la cuenta queda con saldo deudor y ese saldo se suma al monto a depositar.

## 14. Liquidación

Validado el 13/10/2026. Resumen periódico al propietario, con detalle por bien y total general.

| Campo | Tipo | Obligatorio | Observación |
| --- | --- | --- | --- |
| propietario\_id | Vínculo a propietario | Sí | O el representante, en condominio. |
| numero | LIQ-AAAA-NNNN | — | Correlativo por año; se asigna al emitir. |
| periodo\_desde / periodo\_hasta | Fecha | Sí | Según la periodicidad del propietario. |
| estado | Borrador / Emitida / Enviada / Reabierta | Sí |  |
| totales | Por moneda: ingresos, egresos, honorarios, saldo | — | Calculados. |
| fecha\_emision | Fecha | — | Al emitir. |
| pdf | Archivo | — | Se genera al emitir. |
| fecha\_envio / enviada\_a | Fecha y email | — | Al enviar. |

### 14.1 Contenido

1. Detalle por bien: alquileres percibidos, pagos de obligaciones, gastos y honorarios.
2. Total general por moneda y saldo resultante.
3. Cobros y pagos directos, como información, sin afectar el saldo.
4. Obligaciones pendientes a cargo del propietario y monto a depositar.

### 14.2 Reglas de negocio

- **LIQ-01** En borrador se recalcula cada vez que se abre; al emitirla se congela, se genera el PDF y se cierra el período.
- **LIQ-02** El envío es manual: por email al email principal del propietario, por WhatsApp desde la app o descargando el PDF. Se registran la fecha y el medio de envío.
- **LIQ-03** Solo el administrador puede reabrir una liquidación, y solo la última emitida de ese propietario. Al reabrirla, el período vuelve a estar abierto y la versión anterior queda en la auditoría.
- **LIQ-04** Los honorarios se debitan al emitir, según el acuerdo vigente en el período.
- **LIQ-05** No pueden existir dos liquidaciones emitidas de un mismo propietario con períodos superpuestos.

* **LIQ-06** Se pueden generar en borrador las liquidaciones de todos los propietarios de un período en una sola operación; cada una se revisa y emite por separado.

- **LIQ-07** Todo envío de informes (liquidaciones, resúmenes, recibos, avisos) registra su estado: Enviado, Falló o Rebotó. Ante una falla se avisa al administrador y el envío puede reintentarse.
- **LIQ-08** Cada resumen de depósito que se envía se guarda con número DEP-AAAA-NNNN, fecha, horizonte, montos por moneda y PDF, y queda en el historial del propietario.

## 15. Documento

Validado el 13/10/2026. Archivos adjuntos a cualquier objeto: contratos, boletas, comprobantes, recibos y fotos.

| Campo | Tipo | Obligatorio | Observación |
| --- | --- | --- | --- |
| entidad / entidad\_id | Objeto al que pertenece | Sí | Lo completa el sistema. |
| tipo | Contrato / Boleta / Comprobante / Recibo / Foto / Otro | Sí |  |
| visible\_propietario | Sí / No | Sí | Por defecto: No. |
| archivo | PDF o imagen, hasta 25 MB | Sí |  |
| descripcion | Texto | No |  |

- **DOC-01** Un objeto admite varios documentos.
- **DOC-02** El propietario ve solo los documentos marcados como visibles de sus bienes.
- **DOC-03** Los archivos se guardan en almacenamiento privado y se acceden con enlaces temporales.

## 16. Índice IPC (informativo)

Validado el 13/10/2026. Se importa desde la publicación del INDEC; no interviene en ningún cálculo.

| Campo | Tipo | Obligatorio | Observación |
| --- | --- | --- | --- |
| periodo | Mes y año | Sí | Único. |
| variacion\_mensual | Porcentaje | Sí |  |
| acumulado\_anio | Porcentaje | Sí | Año calendario. |
| interanual | Porcentaje | Sí |  |
| fuente / fecha\_importacion | Texto y fecha | — | Lo completa el sistema. |

- **IPC-01** Los tres valores se importan tal como los publica el INDEC; no se recalculan.
- **IPC-02** Si la importación falla, el administrador puede cargarlos manualmente.
- **IPC-03** Un período ya importado solo se reemplaza si el INDEC publica una corrección.

## 17. Auditoría

Validado el 13/10/2026. Registro automático de toda alta, modificación y anulación.

| Campo | Tipo | Observación |
| --- | --- | --- |
| tabla / registro\_id | Texto | Qué se modificó. |
| accion | Alta / Modificación / Anulación / Reapertura |  |
| valores\_antes / valores\_despues | JSON |  |
| usuario\_id / fecha | Usuario y fecha y hora |  |

- **AUD-01** Pueden consultarla los administradores (todo) y los operadores (solo lo referido a sus bienes asignados).
- **AUD-02** Nadie puede editar ni borrar registros de auditoría.
- **AUD-03** Se conserva durante 5 años; vencido el plazo se depura el registro de cambios, nunca las operaciones (pagos, cobros, movimientos, liquidaciones).

## 18. Administración

Validado el 14/10/2026. Datos de la única administración del sistema: se cargan en la configuración inicial (P-06) y se editan en Datos de la administración (P-40).

| Campo | Tipo | Obligatorio | Observación |
| --- | --- | --- | --- |
| nombre | Texto | Sí | Figura en los PDF y en los emails. |
| logo | Imagen (PNG, JPG o SVG) | No | Encabeza los PDF y la firma de los emails; sin logo se muestra solo el nombre. |
| cuit | Texto | No |  |
| contacto | Teléfono, email y dirección | No |  |
| cuenta\_deposito | Banco, titular, CBU y alias | Sí, para el resumen de depósito | Cuenta donde depositan los propietarios. |
| email\_envio | Email | Sí, para enviar por email | Remitente de los envíos; las respuestas llegan a la administración. |
| idioma\_defecto | Español / Inglés / Portugués | Sí | Por defecto: Español. |
| moneda\_defecto | ARS / USD | Sí | Por defecto: ARS. |
| dias\_aviso\_recurrentes | Número | Sí | Días antes de fin de mes para la ventana de gastos (OBL-08). Por defecto: 5. |

- **ADM-01** Existe una sola administración; no hay multiempresa.
- **ADM-02** El logo de la aplicación (Mosaico) es fijo y no se reemplaza con el de la administración.

## 19. Plantilla de envío

Validado el 14/10/2026. Textos que acompañan cada PDF; los valores por defecto están en la pestaña Textos de envío.

| Campo | Tipo | Obligatorio | Observación |
| --- | --- | --- | --- |
| documento | Liquidación / Resumen de depósito / Recibo | Sí |  |
| canal | Email / WhatsApp | Sí |  |
| idioma | Español / Inglés / Portugués | Sí |  |
| asunto | Texto | Sí, en email |  |
| cuerpo | Texto con datos entre llaves | Sí | Por ejemplo {nombre}, {monto}, {fecha\_limite}. |

- **PLA-01** Hay una plantilla por documento, canal e idioma. El sistema trae los textos por defecto y el administrador puede editarlos en P-49 y restaurar el original.
- **PLA-02** Un dato entre llaves que el sistema no reconoce impide guardar la plantilla.

## 20. Envío

Validado el 14/10/2026. Registro de cada envío de un informe.

| Campo | Tipo | Obligatorio | Observación |
| --- | --- | --- | --- |
| documento\_tipo / documento\_id | Liquidación, resumen de depósito o recibo | Sí | Lo completa el sistema. |
| canal | Email / WhatsApp / Descarga | Sí |  |
| destinatario | Email o teléfono | Sí |  |
| idioma | Español / Inglés / Portugués | Sí | El idioma de informes del destinatario. |
| texto | Texto | Sí | El texto efectivamente enviado, con las correcciones de ese envío. |
| estado | Enviado / Falló / Rebotó / Abierto en WhatsApp | Sí | LIQ-07. |
| usuario\_id / fecha | Usuario y fecha y hora | Sí |  |

- **ENV-01** Todo envío queda registrado. En WhatsApp se registra al abrir la conversación, porque la confirmación final la hace el usuario en su teléfono.
- **ENV-02** Si un email falla o rebota, se avisa al administrador y el envío puede reintentarse (LIQ-07).
