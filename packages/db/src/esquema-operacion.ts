// Bloque 2 del esquema: inquilinos, contratos, obligaciones, pagos, cobros, cuenta corriente,
// liquidaciones y documentos. Nombres exactos del diccionario de datos.
// Los registros contables (pago, cobro_alquiler, movimiento) son de solo inserción: las
// protecciones se agregan en el bloque 3. El saldo y los estados calculados NO se guardan.
import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  bigint,
  integer,
  boolean,
  check,
  date,
  index,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import {
  centavos,
  columnasBase,
  estadoActivo,
  periodicidad,
  idioma,
  moneda,
  responsable,
  tipoPersona,
} from "./comunes";
import { bien, bienServicio, concepto, organizacion, propietario, usuario } from "./esquema-base";

export const modalidadCobro = pgEnum("modalidad_cobro", ["administracion", "directo_propietario"]);
export const motivoCanon = pgEnum("motivo_canon", ["inicial", "ajuste", "renegociacion"]);
export const pagadoPor = pgEnum("pagado_por", ["administracion", "propietario_directo", "inquilino"]);
export const medioPago = pgEnum("medio_pago", [
  "transferencia",
  "efectivo",
  "debito_automatico",
  "tarjeta",
  "pago_mis_cuentas",
  "otro",
]);
export const medioCobro = pgEnum("medio_cobro", ["transferencia", "efectivo", "otro"]);
export const acreditacionCobro = pgEnum("acreditacion_cobro", ["equivalente_usd", "pesos_recibidos"]); // COB-09
export const tipoMovimiento = pgEnum("tipo_movimiento", [
  "alquiler_percibido",
  "pago_obligacion",
  "honorarios",
  "contramovimiento_anulacion",
  "deposito_propietario",
  "transferencia_propietario",
  "gasto_extraordinario",
  "ajuste_manual",
  "traspaso_moneda",
]);
export const origenMovimiento = pgEnum("origen_movimiento", ["pago", "cobro", "honorario", "manual"]);
export const estadoLiquidacion = pgEnum("estado_liquidacion", ["borrador", "emitida", "enviada", "reabierta"]);
export const tipoDocumento = pgEnum("tipo_documento", ["contrato", "boleta", "comprobante", "recibo", "foto", "otro"]);
export const entidadDocumento = pgEnum("entidad_documento", [
  "bien",
  "propietario",
  "inquilino",
  "contrato",
  "obligacion",
  "pago",
  "cobro_alquiler",
  "movimiento",
  "liquidacion",
]);
export const tipoInforme = pgEnum("tipo_informe", ["liquidacion", "resumen_deposito", "recibo"]);
export const canalPlantilla = pgEnum("canal_plantilla", ["email", "whatsapp"]);
export const canalEnvio = pgEnum("canal_envio", ["email", "whatsapp", "descarga"]);
export const estadoEnvio = pgEnum("estado_envio", ["enviado", "fallo", "rebotado", "abierto_whatsapp"]);

const organizacionId = () =>
  uuid("organizacion_id")
    .notNull()
    .references(() => organizacion.id);

// Mes y año: se guarda el primer día del mes.
const periodoPrimerDia = (columna: unknown) => sql`extract(day from ${columna}) = 1`;

// 6. Inquilino
export const inquilino = pgTable(
  "inquilino",
  {
    ...columnasBase(),
    organizacionId: organizacionId(),
    tipoPersona: tipoPersona("tipo_persona").notNull().default("humana"),
    nombreRazonSocial: text("nombre_razon_social").notNull(),
    telefonos: jsonb("telefonos").$type<{ tipo: string; numero: string }[]>().notNull(),
    emails: jsonb("emails").$type<{ email: string; principal: boolean }[]>().notNull(),
    estado: estadoActivo("estado").notNull().default("activo"),
    documento: text("documento"),
    idiomaInformes: idioma("idioma_informes").notNull().default("es"),
    avatarPath: text("avatar_path"),
    observaciones: text("observaciones"),
  },
  (t) => [
    index("inquilino_organizacion_idx").on(t.organizacionId),
    uniqueIndex("inquilino_documento_uq")
      .on(t.documento)
      .where(sql`${t.deletedAt} is null and ${t.documento} is not null`), // INQ-02
  ],
);

// 7. Contrato. El estado (Vigente, Finalizado, Rescindido) se calcula (CTR-01).
export const contrato = pgTable(
  "contrato",
  {
    ...columnasBase(),
    organizacionId: organizacionId(),
    bienId: uuid("bien_id")
      .notNull()
      .references(() => bien.id),
    inquilinoId: uuid("inquilino_id")
      .notNull()
      .references(() => inquilino.id),
    moneda: moneda("moneda").notNull().default("ARS"),
    canonInicial: centavos("canon_inicial").notNull(),
    modalidadCobro: modalidadCobro("modalidad_cobro").notNull(),
    fechaInicio: date("fecha_inicio", { mode: "string" }),
    fechaFin: date("fecha_fin", { mode: "string" }),
    periodicidadAjuste: periodicidad("periodicidad_ajuste"),
    indiceReferencia: text("indice_referencia"),
    rescisionFecha: date("rescision_fecha", { mode: "string" }),
    rescisionMotivo: text("rescision_motivo"),
    contratoAnteriorId: uuid("contrato_anterior_id").references((): AnyPgColumn => contrato.id),
    diaVencimiento: integer("dia_vencimiento"),
    observaciones: text("observaciones"),
  },
  (t) => [
    index("contrato_organizacion_idx").on(t.organizacionId),
    index("contrato_bien_idx").on(t.bienId),
    index("contrato_inquilino_idx").on(t.inquilinoId),
    check("contrato_canon_ck", sql`${t.canonInicial} > 0`),
    check("contrato_fechas_ck", sql`${t.fechaFin} is null or ${t.fechaInicio} is null or ${t.fechaFin} >= ${t.fechaInicio}`),
    check("contrato_dia_ck", sql`${t.diaVencimiento} is null or ${t.diaVencimiento} between 1 and 31`),
    check(
      "contrato_ajuste_ck",
      sql`${t.periodicidadAjuste} is null or ${t.periodicidadAjuste} in ('trimestral','cuatrimestral','semestral','anual')`,
    ),
  ],
);

// 8. Canon (tramos). La moneda es la del contrato (CAN-01); la variación y el IPC se calculan.
export const canonTramo = pgTable(
  "canon_tramo",
  {
    ...columnasBase(),
    organizacionId: organizacionId(),
    contratoId: uuid("contrato_id")
      .notNull()
      .references(() => contrato.id),
    vigenteDesde: date("vigente_desde", { mode: "string" }),
    monto: centavos("monto"),
    motivo: motivoCanon("motivo"),
    observaciones: text("observaciones"),
  },
  (t) => [
    index("canon_tramo_organizacion_idx").on(t.organizacionId),
    uniqueIndex("canon_tramo_uq")
      .on(t.contratoId, t.vigenteDesde)
      .where(sql`${t.deletedAt} is null and ${t.vigenteDesde} is not null`), // CAN-03
    check("canon_tramo_periodo_ck", sql`${t.vigenteDesde} is null or ${periodoPrimerDia(t.vigenteDesde)}`),
    check("canon_tramo_monto_ck", sql`${t.monto} is null or ${t.monto} > 0`),
  ],
);

// 9. Matriz de responsabilidad
export const contratoResponsabilidad = pgTable(
  "contrato_responsabilidad",
  {
    ...columnasBase(),
    organizacionId: organizacionId(),
    contratoId: uuid("contrato_id")
      .notNull()
      .references(() => contrato.id),
    conceptoId: uuid("concepto_id")
      .notNull()
      .references(() => concepto.id),
    responsable: responsable("responsable").notNull(),
  },
  (t) => [
    index("contrato_responsabilidad_organizacion_idx").on(t.organizacionId),
    uniqueIndex("contrato_responsabilidad_uq").on(t.contratoId, t.conceptoId).where(sql`${t.deletedAt} is null`), // RES-02
  ],
);

// 10. Obligación. El estado (A completar, Pendiente, Vencida, Pagada, Anulada) se calcula en la
// vista `obligacion_estado`. Boleta y comprobantes se guardan en `documento`.
export const obligacion = pgTable(
  "obligacion",
  {
    ...columnasBase(),
    organizacionId: organizacionId(),
    bienServicioId: uuid("bien_servicio_id").references(() => bienServicio.id),
    bienId: uuid("bien_id")
      .notNull()
      .references(() => bien.id),
    conceptoId: uuid("concepto_id")
      .notNull()
      .references(() => concepto.id),
    periodo: date("periodo", { mode: "string" }).notNull(),
    esRecurrente: boolean("es_recurrente").notNull().default(false),
    frecuencia: periodicidad("frecuencia"),
    monto: centavos("monto"),
    moneda: moneda("moneda").notNull().default("ARS"),
    responsable: responsable("responsable").notNull(),
    vencimiento: date("vencimiento", { mode: "string" }),
    descripcion: text("descripcion"),
    codigoPago: text("codigo_pago"),
    observaciones: text("observaciones"),
    anulada: boolean("anulada").notNull().default(false),
    anulacionMotivo: text("anulacion_motivo"),
    anulacionFecha: timestamp("anulacion_fecha", { withTimezone: true }),
  },
  (t) => [
    index("obligacion_organizacion_idx").on(t.organizacionId),
    index("obligacion_bien_periodo_idx").on(t.bienId, t.periodo),
    index("obligacion_vencimiento_idx").on(t.vencimiento),
    uniqueIndex("obligacion_servicio_periodo_uq")
      .on(t.bienServicioId, t.periodo)
      .where(sql`${t.deletedAt} is null and ${t.anulada} = false and ${t.bienServicioId} is not null`), // OBL-03
    check("obligacion_periodo_ck", periodoPrimerDia(t.periodo)),
    check("obligacion_recurrente_ck", sql`${t.esRecurrente} = false or ${t.frecuencia} is not null`),
    check("obligacion_gasto_suelto_ck", sql`${t.bienServicioId} is not null or length(trim(coalesce(${t.descripcion}, ''))) > 0`), // OBL-04
    check("obligacion_monto_ck", sql`${t.monto} is null or ${t.monto} > 0`),
    check("obligacion_anulacion_ck", sql`${t.anulada} = false or (${t.anulacionMotivo} is not null and ${t.anulacionFecha} is not null)`),
  ],
);

// 11. Pago: cancela una sola obligación por completo, en la moneda de ella (PAG-01, PAG-03).
export const pago = pgTable(
  "pago",
  {
    ...columnasBase(),
    organizacionId: organizacionId(),
    obligacionId: uuid("obligacion_id")
      .notNull()
      .references(() => obligacion.id),
    fecha: date("fecha", { mode: "string" }).notNull(),
    importe: centavos("importe").notNull(),
    pagadoPor: pagadoPor("pagado_por").notNull(),
    medio: medioPago("medio"),
    nroOperacion: text("nro_operacion"),
    observaciones: text("observaciones"),
    enConflicto: boolean("en_conflicto").notNull().default(false), // PAG-07
    anulado: boolean("anulado").notNull().default(false),
    anulacionMotivo: text("anulacion_motivo"),
    anulacionFecha: timestamp("anulacion_fecha", { withTimezone: true }),
    anulacionUsuarioId: uuid("anulacion_usuario_id").references(() => usuario.id),
  },
  (t) => [
    index("pago_organizacion_idx").on(t.organizacionId),
    uniqueIndex("pago_obligacion_uq")
      .on(t.obligacionId)
      .where(sql`${t.deletedAt} is null and ${t.anulado} = false and ${t.enConflicto} = false`), // PAG-01
    check("pago_importe_ck", sql`${t.importe} > 0`),
    check(
      "pago_anulacion_ck",
      sql`${t.anulado} = false or (${t.anulacionMotivo} is not null and ${t.anulacionFecha} is not null and ${t.anulacionUsuarioId} is not null)`,
    ),
  ],
);

// 12. Cobro de alquiler: uno por contrato y período (COB-01). El total se calcula.
export const cobroAlquiler = pgTable(
  "cobro_alquiler",
  {
    ...columnasBase(),
    organizacionId: organizacionId(),
    contratoId: uuid("contrato_id")
      .notNull()
      .references(() => contrato.id),
    periodo: date("periodo", { mode: "string" }).notNull(),
    fecha: date("fecha", { mode: "string" }).notNull(),
    importe: centavos("importe").notNull(),
    percibidoPor: modalidadCobro("percibido_por").notNull(),
    punitorios: centavos("punitorios").notNull().default(0),
    bonificacion: centavos("bonificacion").notNull().default(0),
    bonificacionMotivo: text("bonificacion_motivo"),
    gastosRecuperados: centavos("gastos_recuperados").notNull().default(0),
    medio: medioCobro("medio"),
    reciboNumero: text("recibo_numero"), // REC-AAAA-NNNN; provisorio hasta sincronizar (COB-10)
    observaciones: text("observaciones"),
    // COB-09: contrato en dólares cobrado en pesos
    importeRecibido: centavos("importe_recibido"),
    monedaRecibida: moneda("moneda_recibida"),
    tipoCambio: numeric("tipo_cambio", { precision: 18, scale: 6 }),
    acreditacion: acreditacionCobro("acreditacion"),
    total: centavos("total").generatedAlwaysAs(sql`importe + punitorios - bonificacion + gastos_recuperados`),
    enConflicto: boolean("en_conflicto").notNull().default(false),
    anulado: boolean("anulado").notNull().default(false),
    anulacionMotivo: text("anulacion_motivo"),
    anulacionFecha: timestamp("anulacion_fecha", { withTimezone: true }),
    anulacionUsuarioId: uuid("anulacion_usuario_id").references(() => usuario.id),
  },
  (t) => [
    index("cobro_alquiler_organizacion_idx").on(t.organizacionId),
    uniqueIndex("cobro_alquiler_periodo_uq")
      .on(t.contratoId, t.periodo)
      .where(sql`${t.deletedAt} is null and ${t.anulado} = false and ${t.enConflicto} = false`), // COB-01
    uniqueIndex("cobro_alquiler_recibo_uq")
      .on(t.organizacionId, t.reciboNumero)
      .where(sql`${t.reciboNumero} is not null`), // COB-06
    check("cobro_alquiler_periodo_ck", periodoPrimerDia(t.periodo)),
    check("cobro_alquiler_importe_ck", sql`${t.importe} > 0 and ${t.punitorios} >= 0 and ${t.bonificacion} >= 0 and ${t.gastosRecuperados} >= 0`),
    check("cobro_alquiler_bonificacion_ck", sql`${t.bonificacion} = 0 or ${t.bonificacionMotivo} is not null`),
    check(
      "cobro_alquiler_cambio_ck",
      sql`(${t.importeRecibido} is null and ${t.monedaRecibida} is null and ${t.tipoCambio} is null and ${t.acreditacion} is null)
       or (${t.importeRecibido} > 0 and ${t.monedaRecibida} is not null and ${t.acreditacion} is not null
           and (${t.acreditacion} = 'pesos_recibidos' or ${t.tipoCambio} > 0))`,
    ),
    check(
      "cobro_alquiler_anulacion_ck",
      sql`${t.anulado} = false or (${t.anulacionMotivo} is not null and ${t.anulacionFecha} is not null and ${t.anulacionUsuarioId} is not null)`,
    ),
  ],
);

// 14. Liquidación. Los totales por moneda se congelan al emitir en `liquidacion_total`.
export const liquidacion = pgTable(
  "liquidacion",
  {
    ...columnasBase(),
    organizacionId: organizacionId(),
    propietarioId: uuid("propietario_id")
      .notNull()
      .references(() => propietario.id),
    numero: text("numero"), // LIQ-AAAA-NNNN, se asigna al emitir
    periodoDesde: date("periodo_desde", { mode: "string" }).notNull(),
    periodoHasta: date("periodo_hasta", { mode: "string" }).notNull(),
    estado: estadoLiquidacion("estado").notNull().default("borrador"),
    fechaEmision: date("fecha_emision", { mode: "string" }),
    pdfPath: text("pdf_path"),
    fechaEnvio: timestamp("fecha_envio", { withTimezone: true }),
    enviadaA: text("enviada_a"),
  },
  (t) => [
    index("liquidacion_organizacion_idx").on(t.organizacionId),
    index("liquidacion_propietario_idx").on(t.propietarioId),
    uniqueIndex("liquidacion_numero_uq").on(t.organizacionId, t.numero).where(sql`${t.numero} is not null`),
    check("liquidacion_periodo_ck", sql`${t.periodoHasta} >= ${t.periodoDesde}`),
    check("liquidacion_emitida_ck", sql`${t.estado} = 'borrador' or (${t.numero} is not null and ${t.fechaEmision} is not null)`),
  ],
);

export const liquidacionTotal = pgTable(
  "liquidacion_total",
  {
    ...columnasBase(),
    organizacionId: organizacionId(),
    liquidacionId: uuid("liquidacion_id")
      .notNull()
      .references(() => liquidacion.id),
    moneda: moneda("moneda").notNull(),
    totalIngresos: centavos("total_ingresos").notNull().default(0),
    totalEgresos: centavos("total_egresos").notNull().default(0),
    honorarios: centavos("honorarios").notNull().default(0),
    saldo: centavos("saldo").notNull().default(0),
  },
  (t) => [
    index("liquidacion_total_organizacion_idx").on(t.organizacionId),
    uniqueIndex("liquidacion_total_uq").on(t.liquidacionId, t.moneda).where(sql`${t.deletedAt} is null`),
  ],
);

// 13. Movimiento: libro de la cuenta corriente, por propietario y moneda (RN-14).
// El saldo no se guarda. Una anulación es un contramovimiento enlazado al original.
export const movimiento = pgTable(
  "movimiento",
  {
    ...columnasBase(),
    organizacionId: organizacionId(),
    propietarioId: uuid("propietario_id")
      .notNull()
      .references(() => propietario.id),
    bienId: uuid("bien_id")
      .notNull()
      .references(() => bien.id),
    moneda: moneda("moneda").notNull(),
    fecha: date("fecha", { mode: "string" }).notNull(),
    tipo: tipoMovimiento("tipo").notNull(),
    debe: centavos("debe").notNull().default(0),
    haber: centavos("haber").notNull().default(0),
    descripcion: text("descripcion").notNull(),
    origenTipo: origenMovimiento("origen_tipo").notNull(),
    origenId: uuid("origen_id"),
    liquidacionId: uuid("liquidacion_id").references(() => liquidacion.id),
    contramovimientoDeId: uuid("contramovimiento_de_id").references((): AnyPgColumn => movimiento.id),
    traspasoId: uuid("traspaso_id"), // une los dos movimientos de un traspaso (MOV-04)
    tipoCambio: numeric("tipo_cambio", { precision: 18, scale: 6 }),
  },
  (t) => [
    index("movimiento_organizacion_idx").on(t.organizacionId),
    index("movimiento_saldo_idx").on(t.propietarioId, t.moneda, t.fecha),
    index("movimiento_bien_idx").on(t.bienId),
    index("movimiento_liquidacion_idx").on(t.liquidacionId),
    uniqueIndex("movimiento_contramovimiento_uq").on(t.contramovimientoDeId).where(sql`${t.contramovimientoDeId} is not null`),
    check("movimiento_importe_ck", sql`(${t.debe} > 0 and ${t.haber} = 0) or (${t.haber} > 0 and ${t.debe} = 0)`),
    check("movimiento_origen_ck", sql`(${t.origenTipo} = 'manual') = (${t.origenId} is null) or ${t.tipo} = 'contramovimiento_anulacion'`),
    check("movimiento_traspaso_ck", sql`${t.tipo} <> 'traspaso_moneda' or (${t.traspasoId} is not null and ${t.tipoCambio} > 0)`), // MOV-04
  ],
);

// LIQ-08: cada resumen de depósito enviado se guarda con su número DEP-AAAA-NNNN.
export const resumenDeposito = pgTable(
  "resumen_deposito",
  {
    ...columnasBase(),
    organizacionId: organizacionId(),
    propietarioId: uuid("propietario_id")
      .notNull()
      .references(() => propietario.id),
    numero: text("numero").notNull(),
    fecha: date("fecha", { mode: "string" }).notNull(),
    horizonteDias: integer("horizonte_dias").notNull(),
    fechaLimite: date("fecha_limite", { mode: "string" }).notNull(),
    pdfPath: text("pdf_path"),
  },
  (t) => [
    index("resumen_deposito_organizacion_idx").on(t.organizacionId),
    index("resumen_deposito_propietario_idx").on(t.propietarioId),
    uniqueIndex("resumen_deposito_numero_uq").on(t.organizacionId, t.numero),
    check("resumen_deposito_horizonte_ck", sql`${t.horizonteDias} > 0`),
  ],
);

export const resumenDepositoMonto = pgTable(
  "resumen_deposito_monto",
  {
    ...columnasBase(),
    organizacionId: organizacionId(),
    resumenDepositoId: uuid("resumen_deposito_id")
      .notNull()
      .references(() => resumenDeposito.id),
    moneda: moneda("moneda").notNull(),
    obligacionesPendientes: centavos("obligaciones_pendientes").notNull().default(0),
    saldoDisponible: centavos("saldo_disponible").notNull().default(0),
    reposicionFondo: centavos("reposicion_fondo").notNull().default(0),
    aDepositar: centavos("a_depositar").notNull().default(0),
    saldoATransferir: centavos("saldo_a_transferir").notNull().default(0),
  },
  (t) => [
    index("resumen_deposito_monto_organizacion_idx").on(t.organizacionId),
    uniqueIndex("resumen_deposito_monto_uq").on(t.resumenDepositoId, t.moneda).where(sql`${t.deletedAt} is null`),
    check("resumen_deposito_monto_ck", sql`${t.aDepositar} >= 0 and ${t.saldoATransferir} >= 0`),
  ],
);

// 15. Documento: archivos adjuntos a cualquier objeto (boletas, comprobantes, contratos, fotos).
export const documento = pgTable(
  "documento",
  {
    ...columnasBase(),
    organizacionId: organizacionId(),
    entidad: entidadDocumento("entidad").notNull(),
    entidadId: uuid("entidad_id").notNull(),
    tipo: tipoDocumento("tipo").notNull(),
    visiblePropietario: boolean("visible_propietario").notNull().default(false),
    archivoPath: text("archivo_path").notNull(),
    tipoMime: text("tipo_mime").notNull(),
    tamanoBytes: bigint("tamano_bytes", { mode: "number" }).notNull(),
    descripcion: text("descripcion"),
  },
  (t) => [
    index("documento_organizacion_idx").on(t.organizacionId),
    index("documento_entidad_idx").on(t.entidad, t.entidadId),
    check("documento_tamano_ck", sql`${t.tamanoBytes} > 0 and ${t.tamanoBytes} <= 26214400`), // hasta 25 MB
    check("documento_mime_ck", sql`${t.tipoMime} = 'application/pdf' or ${t.tipoMime} like 'image/%'`),
  ],
);

// 16. Índice IPC (informativo)
export const indiceIpc = pgTable(
  "indice_ipc",
  {
    ...columnasBase(),
    organizacionId: organizacionId(),
    periodo: date("periodo", { mode: "string" }).notNull(),
    variacionMensual: numeric("variacion_mensual", { precision: 9, scale: 4 }).notNull(),
    acumuladoAnio: numeric("acumulado_anio", { precision: 9, scale: 4 }).notNull(),
    interanual: numeric("interanual", { precision: 9, scale: 4 }).notNull(),
    fuente: text("fuente"),
    fechaImportacion: timestamp("fecha_importacion", { withTimezone: true }),
  },
  (t) => [
    index("indice_ipc_organizacion_idx").on(t.organizacionId),
    uniqueIndex("indice_ipc_periodo_uq").on(t.organizacionId, t.periodo).where(sql`${t.deletedAt} is null`),
    check("indice_ipc_periodo_ck", periodoPrimerDia(t.periodo)),
  ],
);

// 19. Plantilla de envío: una por documento, canal e idioma (PLA-01).
export const plantillaEnvio = pgTable(
  "plantilla_envio",
  {
    ...columnasBase(),
    organizacionId: organizacionId(),
    documento: tipoInforme("documento").notNull(),
    canal: canalPlantilla("canal").notNull(),
    idioma: idioma("idioma").notNull(),
    asunto: text("asunto"),
    cuerpo: text("cuerpo").notNull(),
  },
  (t) => [
    index("plantilla_envio_organizacion_idx").on(t.organizacionId),
    uniqueIndex("plantilla_envio_uq").on(t.organizacionId, t.documento, t.canal, t.idioma).where(sql`${t.deletedAt} is null`),
    check("plantilla_envio_asunto_ck", sql`${t.canal} <> 'email' or length(trim(coalesce(${t.asunto}, ''))) > 0`),
  ],
);

// 20. Envío: registro de cada envío de un informe (ENV-01).
export const envio = pgTable(
  "envio",
  {
    ...columnasBase(),
    organizacionId: organizacionId(),
    documentoTipo: tipoInforme("documento_tipo").notNull(),
    documentoId: uuid("documento_id").notNull(),
    canal: canalEnvio("canal").notNull(),
    destinatario: text("destinatario").notNull(),
    idioma: idioma("idioma").notNull(),
    texto: text("texto").notNull(),
    estado: estadoEnvio("estado").notNull(),
    usuarioId: uuid("usuario_id")
      .notNull()
      .references(() => usuario.id),
    fecha: timestamp("fecha", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("envio_organizacion_idx").on(t.organizacionId),
    index("envio_documento_idx").on(t.documentoTipo, t.documentoId),
  ],
);
