// Bloque 1 del esquema: administración, usuarios, propietarios, bienes y su configuración.
// Nombres exactos del diccionario de datos (docs/especificacion/02-diccionario-de-datos.md).
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import {
  apariencia,
  canalNotificaciones,
  categoriaConcepto,
  centavos,
  columnasBase,
  estadoActivo,
  estadoBien,
  estadoUsuario,
  idioma,
  modalidadHonorarios,
  modalidadReparto,
  modoHonorarios,
  modoLiquidacion,
  moneda,
  periodicidad,
  politicaDobleFactor,
  responsable,
  rol,
  tipoBien,
  tipoCuenta,
  tipoPersona,
} from "./comunes";

// 18. Administración: registro único (ADM-01). Es la raíz de `organizacion_id`.
export const organizacion = pgTable("organizacion", {
  ...columnasBase(),
  nombre: text("nombre").notNull(),
  logoPath: text("logo_path"),
  cuit: text("cuit"),
  contactoTelefono: text("contacto_telefono"),
  contactoEmail: text("contacto_email"),
  contactoDireccion: text("contacto_direccion"),
  cuentaDepositoBanco: text("cuenta_deposito_banco"),
  cuentaDepositoTitular: text("cuenta_deposito_titular"),
  cuentaDepositoCbu: text("cuenta_deposito_cbu"),
  cuentaDepositoAlias: text("cuenta_deposito_alias"),
  emailEnvio: text("email_envio"),
  idiomaDefecto: idioma("idioma_defecto").notNull().default("es"),
  monedaDefecto: moneda("moneda_defecto").notNull().default("ARS"),
  diasAvisoRecurrentes: integer("dias_aviso_recurrentes").notNull().default(5),
  politicaDobleFactor: politicaDobleFactor("politica_doble_factor").notNull().default("desactivado"), // USU-09
  registroAbiertoHabilitado: boolean("registro_abierto_habilitado").notNull().default(false), // USU-08
});

export const organizacionId = () =>
  uuid("organizacion_id")
    .notNull()
    .references(() => organizacion.id);

// 1. Propietario
export const propietario = pgTable(
  "propietario",
  {
    ...columnasBase(),
    organizacionId: organizacionId(),
    tipoPersona: tipoPersona("tipo_persona").notNull().default("humana"),
    nombreRazonSocial: text("nombre_razon_social").notNull(),
    // [{ tipo, numero }], al menos uno
    telefonos: jsonb("telefonos").$type<{ tipo: string; numero: string }[]>().notNull(),
    // [{ email, principal }], exactamente uno principal (PRO-04)
    emails: jsonb("emails").$type<{ email: string; principal: boolean }[]>().notNull(),
    estado: estadoActivo("estado").notNull().default("activo"),
    apoderadoNombre: text("apoderado_nombre"),
    apoderadoContacto: text("apoderado_contacto"),
    periodicidadLiquidacion: text("periodicidad_liquidacion").notNull().default("mensual"),
    diaLiquidacion: integer("dia_liquidacion"),
    horizonteResumenDias: integer("horizonte_resumen_dias").notNull().default(30),
    fondoReservaArs: centavos("fondo_reserva_ars"),
    fondoReservaUsd: centavos("fondo_reserva_usd"),
    idiomaInformes: idioma("idioma_informes").notNull().default("es"),
    avatarPath: text("avatar_path"),
    observaciones: text("observaciones"),
  },
  (t) => [
    index("propietario_organizacion_idx").on(t.organizacionId),
    check("propietario_horizonte_ck", sql`${t.horizonteResumenDias} > 0`),
    check("propietario_dia_liquidacion_ck", sql`${t.diaLiquidacion} is null or ${t.diaLiquidacion} between 1 and 31`),
  ],
);

// 2. Usuario. El `id` es el de Supabase Auth (se vincula en el bloque de seguridad).
export const usuario = pgTable(
  "usuario",
  {
    ...columnasBase(),
    organizacionId: organizacionId(),
    nombre: text("nombre").notNull(),
    email: text("email").notNull(),
    // Alternativa al email para ingresar (opcional, único). Lo define el administrador.
    nombreUsuario: text("nombre_usuario"),
    roles: rol("roles").array().notNull(),
    propietarioId: uuid("propietario_id").references(() => propietario.id),
    estado: estadoUsuario("estado").notNull().default("activo"),
    telefono: text("telefono"),
    canalNotificaciones: canalNotificaciones("canal_notificaciones").notNull().default("ambos"),
    idiomaApp: idioma("idioma_app"),
    apariencia: apariencia("apariencia").notNull().default("automatico"),
    dobleFactor: boolean("doble_factor").notNull().default(false),
  },
  (t) => [
    index("usuario_organizacion_idx").on(t.organizacionId),
    uniqueIndex("usuario_email_uq")
      .on(sql`lower(${t.email})`)
      .where(sql`${t.deletedAt} is null`), // USU-01
    uniqueIndex("usuario_nombre_usuario_uq")
      .on(t.nombreUsuario)
      .where(sql`${t.deletedAt} is null and ${t.nombreUsuario} is not null`),
    check(
      "usuario_nombre_usuario_ck",
      sql`${t.nombreUsuario} is null or ${t.nombreUsuario} ~ '^[a-z0-9._-]{3,30}$'`,
    ),
    uniqueIndex("usuario_propietario_uq").on(t.propietarioId).where(sql`${t.deletedAt} is null`), // USU-03
    check("usuario_roles_ck", sql`cardinality(${t.roles}) > 0`),
    check("usuario_rol_propietario_ck", sql`not ('propietario' = any(${t.roles})) or ${t.propietarioId} is not null`),
  ],
);

// 1.1 Cuenta bancaria
export const cuentaBancaria = pgTable(
  "cuenta_bancaria",
  {
    ...columnasBase(),
    organizacionId: organizacionId(),
    banco: text("banco").notNull(),
    tipoCuenta: tipoCuenta("tipo_cuenta").notNull(),
    moneda: moneda("moneda").notNull().default("ARS"),
    cbuCvu: text("cbu_cvu").notNull(),
    alias: text("alias"),
    titular: text("titular").notNull(),
    estado: estadoActivo("estado").notNull().default("activo"),
  },
  (t) => [
    index("cuenta_bancaria_organizacion_idx").on(t.organizacionId),
    check("cuenta_bancaria_cbu_ck", sql`${t.cbuCvu} ~ '^[0-9]{22}$'`),
  ],
);

// Un propietario puede tener varias cuentas y una cuenta, varios propietarios (N:M).
export const propietarioCuenta = pgTable(
  "propietario_cuenta",
  {
    ...columnasBase(),
    organizacionId: organizacionId(),
    propietarioId: uuid("propietario_id")
      .notNull()
      .references(() => propietario.id),
    cuentaBancariaId: uuid("cuenta_bancaria_id")
      .notNull()
      .references(() => cuentaBancaria.id),
    predeterminada: boolean("predeterminada").notNull().default(false),
  },
  (t) => [
    index("propietario_cuenta_organizacion_idx").on(t.organizacionId),
    uniqueIndex("propietario_cuenta_uq").on(t.propietarioId, t.cuentaBancariaId).where(sql`${t.deletedAt} is null`),
  ],
);

// 1.2 Acuerdo de honorarios. El porcentaje no es dinero: va como numérico exacto.
export const acuerdoHonorarios = pgTable(
  "acuerdo_honorarios",
  {
    ...columnasBase(),
    organizacionId: organizacionId(),
    propietarioId: uuid("propietario_id")
      .notNull()
      .references(() => propietario.id),
    modalidad: modalidadHonorarios("modalidad").notNull(),
    porcentaje: numeric("porcentaje", { precision: 7, scale: 4 }),
    montoFijo: centavos("monto_fijo"),
    moneda: moneda("moneda"),
    incluyeCobrosDirectos: boolean("incluye_cobros_directos").notNull().default(false),
    vigenteDesde: date("vigente_desde", { mode: "string" }).notNull(),
    vigenteHasta: date("vigente_hasta", { mode: "string" }),
  },
  (t) => [
    index("acuerdo_honorarios_propietario_idx").on(t.propietarioId),
    check(
      "acuerdo_honorarios_valor_ck",
      sql`(${t.modalidad} = 'porcentaje' and ${t.porcentaje} is not null and ${t.porcentaje} between 0 and 100 and ${t.montoFijo} is null)
       or (${t.modalidad} = 'monto_fijo' and ${t.montoFijo} is not null and ${t.montoFijo} >= 0 and ${t.moneda} is not null and ${t.porcentaje} is null)`,
    ),
    check("acuerdo_honorarios_vigencia_ck", sql`${t.vigenteHasta} is null or ${t.vigenteHasta} >= ${t.vigenteDesde}`),
  ],
);

// 3.1 Edificio o complejo
export const edificio = pgTable(
  "edificio",
  {
    ...columnasBase(),
    organizacionId: organizacionId(),
    nombre: text("nombre").notNull(),
    calle: text("calle").notNull(),
    numero: text("numero").notNull(),
    localidad: text("localidad").notNull(),
    provincia: text("provincia").notNull(),
    codigoPostal: text("codigo_postal"),
    observaciones: text("observaciones"),
  },
  (t) => [index("edificio_organizacion_idx").on(t.organizacionId)],
);

// 3. Bien
export const bien = pgTable(
  "bien",
  {
    ...columnasBase(),
    organizacionId: organizacionId(),
    tipoBien: tipoBien("tipo_bien").notNull(),
    subtipo: text("subtipo"),
    alias: text("alias").notNull(),
    calle: text("calle"),
    numero: text("numero"),
    piso: text("piso"),
    departamento: text("departamento"),
    localidad: text("localidad"),
    provincia: text("provincia"),
    codigoPostal: text("codigo_postal"),
    latitud: numeric("latitud", { precision: 9, scale: 6 }),
    longitud: numeric("longitud", { precision: 9, scale: 6 }),
    dominio: text("dominio"),
    marcaModelo: text("marca_modelo"),
    anio: integer("anio"),
    estado: estadoBien("estado").notNull(),
    edificioId: uuid("edificio_id").references(() => edificio.id),
    unidadFuncional: text("unidad_funcional"),
    modoLiquidacion: modoLiquidacion("modo_liquidacion").notNull().default("por_separado"),
    modoHonorarios: modoHonorarios("modo_honorarios").notNull().default("sobre_parte_de_cada_titular"),
    esGastosVarios: boolean("es_gastos_varios").notNull().default(false), // PROP-06
    observaciones: text("observaciones"),
  },
  (t) => [
    index("bien_organizacion_idx").on(t.organizacionId),
    uniqueIndex("bien_alias_uq")
      .on(sql`lower(${t.alias})`)
      .where(sql`${t.deletedAt} is null`), // PROP-01
    uniqueIndex("bien_dominio_uq")
      .on(sql`upper(${t.dominio})`)
      .where(sql`${t.deletedAt} is null and ${t.dominio} is not null`),
    check("bien_vehiculo_dominio_ck", sql`${t.tipoBien} <> 'vehiculo' or ${t.dominio} is not null`),
    check(
      "bien_direccion_ck",
      sql`${t.tipoBien} not in ('inmueble','terreno') or ${t.edificioId} is not null
        or (${t.calle} is not null and ${t.numero} is not null and ${t.localidad} is not null and ${t.provincia} is not null)`,
    ),
    check("bien_subtipo_ck", sql`${t.tipoBien} not in ('inmueble','vehiculo') or ${t.subtipo} is not null`),
    check(
      "bien_estado_ck",
      sql`(${t.tipoBien} in ('inmueble','terreno') and ${t.estado} in ('disponible','alquilado','en_refaccion','vendido'))
       or (${t.tipoBien} = 'vehiculo' and ${t.estado} in ('activo','vendido'))
       or (${t.tipoBien} = 'otros' and ${t.estado} in ('activo','de_baja'))`,
    ),
    check("bien_coordenadas_ck", sql`(${t.latitud} is null) = (${t.longitud} is null)`),
  ],
);

// Bienes asignados a un operador (USU-04).
export const usuarioBien = pgTable(
  "usuario_bien",
  {
    ...columnasBase(),
    organizacionId: organizacionId(),
    usuarioId: uuid("usuario_id")
      .notNull()
      .references(() => usuario.id),
    bienId: uuid("bien_id")
      .notNull()
      .references(() => bien.id),
  },
  (t) => [
    index("usuario_bien_organizacion_idx").on(t.organizacionId),
    uniqueIndex("usuario_bien_uq").on(t.usuarioId, t.bienId).where(sql`${t.deletedAt} is null`),
  ],
);

// 5.1 Titularidad: tabla puente del condominio.
export const bienPropietario = pgTable(
  "bien_propietario",
  {
    ...columnasBase(),
    organizacionId: organizacionId(),
    bienId: uuid("bien_id")
      .notNull()
      .references(() => bien.id),
    propietarioId: uuid("propietario_id")
      .notNull()
      .references(() => propietario.id),
    porcentaje: numeric("porcentaje", { precision: 7, scale: 4 }).notNull(),
    esRepresentante: boolean("es_representante").notNull().default(false),
    observaciones: text("observaciones"),
  },
  (t) => [
    index("bien_propietario_organizacion_idx").on(t.organizacionId),
    index("bien_propietario_propietario_idx").on(t.propietarioId),
    uniqueIndex("bien_propietario_uq").on(t.bienId, t.propietarioId).where(sql`${t.deletedAt} is null`),
    check("bien_propietario_porcentaje_ck", sql`${t.porcentaje} > 0 and ${t.porcentaje} <= 100`),
  ],
);

// 4.1 Catálogo de conceptos
export const concepto = pgTable(
  "concepto",
  {
    ...columnasBase(),
    organizacionId: organizacionId(),
    nombre: text("nombre").notNull(),
    categoria: categoriaConcepto("categoria").notNull(),
    estado: estadoActivo("estado").notNull().default("activo"),
  },
  (t) => [
    index("concepto_organizacion_idx").on(t.organizacionId),
    uniqueIndex("concepto_nombre_uq")
      .on(sql`lower(${t.nombre})`)
      .where(sql`${t.deletedAt} is null`),
  ],
);

// 4. Servicios e impuestos del bien
export const bienServicio = pgTable(
  "bien_servicio",
  {
    ...columnasBase(),
    organizacionId: organizacionId(),
    bienId: uuid("bien_id")
      .notNull()
      .references(() => bien.id),
    conceptoId: uuid("concepto_id")
      .notNull()
      .references(() => concepto.id),
    nroCuentaCliente: text("nro_cuenta_cliente").notNull(),
    empresaPrestadora: text("empresa_prestadora").notNull(),
    responsableDefault: responsable("responsable_default").notNull(),
    estado: estadoActivo("estado").notNull().default("activo"),
    titularServicio: text("titular_servicio"),
    periodicidad: periodicidad("periodicidad"),
    diaVencimiento: integer("dia_vencimiento"),
    montoEstimado: centavos("monto_estimado"),
    montoEstimadoMoneda: moneda("monto_estimado_moneda"),
    debitoAutomatico: boolean("debito_automatico").notNull().default(false),
    sitioBoletas: text("sitio_boletas"),
    observaciones: text("observaciones"),
  },
  (t) => [
    index("bien_servicio_organizacion_idx").on(t.organizacionId),
    uniqueIndex("bien_servicio_uq").on(t.bienId, t.conceptoId).where(sql`${t.deletedAt} is null`), // SERV-01
    check("bien_servicio_dia_ck", sql`${t.diaVencimiento} is null or ${t.diaVencimiento} between 1 and 31`),
    check("bien_servicio_monto_ck", sql`(${t.montoEstimado} is null) = (${t.montoEstimadoMoneda} is null)`),
  ],
);

// 5.2 Reparto por concepto. Con `aplica_a_alquiler` el concepto queda vacío.
export const repartoConcepto = pgTable(
  "reparto_concepto",
  {
    ...columnasBase(),
    organizacionId: organizacionId(),
    bienId: uuid("bien_id")
      .notNull()
      .references(() => bien.id),
    conceptoId: uuid("concepto_id").references(() => concepto.id),
    aplicaAAlquiler: boolean("aplica_a_alquiler").notNull().default(false),
    modalidad: modalidadReparto("modalidad").notNull(),
    propietarioId: uuid("propietario_id").references(() => propietario.id),
  },
  (t) => [
    index("reparto_concepto_organizacion_idx").on(t.organizacionId),
    uniqueIndex("reparto_concepto_uq")
      .on(t.bienId, sql`coalesce(${t.conceptoId}, '00000000-0000-0000-0000-000000000000'::uuid)`)
      .where(sql`${t.deletedAt} is null`),
    check("reparto_concepto_destino_ck", sql`(${t.conceptoId} is not null) <> ${t.aplicaAAlquiler}`),
    check(
      "reparto_concepto_propietario_ck",
      sql`(${t.modalidad} = 'un_solo_propietario') = (${t.propietarioId} is not null)`,
    ),
  ],
);

// Lista de porcentajes de la modalidad Personalizado (CON-03).
export const repartoConceptoPorcentaje = pgTable(
  "reparto_concepto_porcentaje",
  {
    ...columnasBase(),
    organizacionId: organizacionId(),
    repartoConceptoId: uuid("reparto_concepto_id")
      .notNull()
      .references(() => repartoConcepto.id),
    propietarioId: uuid("propietario_id")
      .notNull()
      .references(() => propietario.id),
    porcentaje: numeric("porcentaje", { precision: 7, scale: 4 }).notNull(),
  },
  (t) => [
    index("reparto_concepto_porcentaje_organizacion_idx").on(t.organizacionId),
    uniqueIndex("reparto_concepto_porcentaje_uq")
      .on(t.repartoConceptoId, t.propietarioId)
      .where(sql`${t.deletedAt} is null`),
    check("reparto_concepto_porcentaje_ck", sql`${t.porcentaje} > 0 and ${t.porcentaje} <= 100`),
  ],
);
