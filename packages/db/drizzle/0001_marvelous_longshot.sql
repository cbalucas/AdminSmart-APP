CREATE TYPE "public"."acreditacion_cobro" AS ENUM('equivalente_usd', 'pesos_recibidos');--> statement-breakpoint
CREATE TYPE "public"."canal_envio" AS ENUM('email', 'whatsapp', 'descarga');--> statement-breakpoint
CREATE TYPE "public"."canal_plantilla" AS ENUM('email', 'whatsapp');--> statement-breakpoint
CREATE TYPE "public"."entidad_documento" AS ENUM('bien', 'propietario', 'inquilino', 'contrato', 'obligacion', 'pago', 'cobro_alquiler', 'movimiento', 'liquidacion');--> statement-breakpoint
CREATE TYPE "public"."estado_envio" AS ENUM('enviado', 'fallo', 'rebotado', 'abierto_whatsapp');--> statement-breakpoint
CREATE TYPE "public"."estado_liquidacion" AS ENUM('borrador', 'emitida', 'enviada', 'reabierta');--> statement-breakpoint
CREATE TYPE "public"."medio_cobro" AS ENUM('transferencia', 'efectivo', 'otro');--> statement-breakpoint
CREATE TYPE "public"."medio_pago" AS ENUM('transferencia', 'efectivo', 'debito_automatico', 'tarjeta', 'pago_mis_cuentas', 'otro');--> statement-breakpoint
CREATE TYPE "public"."modalidad_cobro" AS ENUM('administracion', 'directo_propietario');--> statement-breakpoint
CREATE TYPE "public"."motivo_canon" AS ENUM('inicial', 'ajuste', 'renegociacion');--> statement-breakpoint
CREATE TYPE "public"."origen_movimiento" AS ENUM('pago', 'cobro', 'honorario', 'manual');--> statement-breakpoint
CREATE TYPE "public"."pagado_por" AS ENUM('administracion', 'propietario_directo', 'inquilino');--> statement-breakpoint
CREATE TYPE "public"."tipo_documento" AS ENUM('contrato', 'boleta', 'comprobante', 'recibo', 'foto', 'otro');--> statement-breakpoint
CREATE TYPE "public"."tipo_informe" AS ENUM('liquidacion', 'resumen_deposito', 'recibo');--> statement-breakpoint
CREATE TYPE "public"."tipo_movimiento" AS ENUM('alquiler_percibido', 'pago_obligacion', 'honorarios', 'contramovimiento_anulacion', 'deposito_propietario', 'transferencia_propietario', 'gasto_extraordinario', 'ajuste_manual', 'traspaso_moneda');--> statement-breakpoint
CREATE TABLE "canon_tramo" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"contrato_id" uuid NOT NULL,
	"vigente_desde" date,
	"monto" bigint,
	"motivo" "motivo_canon",
	"observaciones" text,
	CONSTRAINT "canon_tramo_periodo_ck" CHECK ("canon_tramo"."vigente_desde" is null or extract(day from "canon_tramo"."vigente_desde") = 1),
	CONSTRAINT "canon_tramo_monto_ck" CHECK ("canon_tramo"."monto" is null or "canon_tramo"."monto" > 0)
);
--> statement-breakpoint
CREATE TABLE "cobro_alquiler" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"contrato_id" uuid NOT NULL,
	"periodo" date NOT NULL,
	"fecha" date NOT NULL,
	"importe" bigint NOT NULL,
	"percibido_por" "modalidad_cobro" NOT NULL,
	"punitorios" bigint DEFAULT 0 NOT NULL,
	"bonificacion" bigint DEFAULT 0 NOT NULL,
	"bonificacion_motivo" text,
	"gastos_recuperados" bigint DEFAULT 0 NOT NULL,
	"medio" "medio_cobro",
	"recibo_numero" text,
	"observaciones" text,
	"importe_recibido" bigint,
	"moneda_recibida" "moneda",
	"tipo_cambio" numeric(18, 6),
	"acreditacion" "acreditacion_cobro",
	"total" bigint GENERATED ALWAYS AS (importe + punitorios - bonificacion + gastos_recuperados) STORED,
	"en_conflicto" boolean DEFAULT false NOT NULL,
	"anulado" boolean DEFAULT false NOT NULL,
	"anulacion_motivo" text,
	"anulacion_fecha" timestamp with time zone,
	"anulacion_usuario_id" uuid,
	CONSTRAINT "cobro_alquiler_periodo_ck" CHECK (extract(day from "cobro_alquiler"."periodo") = 1),
	CONSTRAINT "cobro_alquiler_importe_ck" CHECK ("cobro_alquiler"."importe" > 0 and "cobro_alquiler"."punitorios" >= 0 and "cobro_alquiler"."bonificacion" >= 0 and "cobro_alquiler"."gastos_recuperados" >= 0),
	CONSTRAINT "cobro_alquiler_bonificacion_ck" CHECK ("cobro_alquiler"."bonificacion" = 0 or "cobro_alquiler"."bonificacion_motivo" is not null),
	CONSTRAINT "cobro_alquiler_cambio_ck" CHECK (("cobro_alquiler"."importe_recibido" is null and "cobro_alquiler"."moneda_recibida" is null and "cobro_alquiler"."tipo_cambio" is null and "cobro_alquiler"."acreditacion" is null)
       or ("cobro_alquiler"."importe_recibido" > 0 and "cobro_alquiler"."moneda_recibida" is not null and "cobro_alquiler"."acreditacion" is not null
           and ("cobro_alquiler"."acreditacion" = 'pesos_recibidos' or "cobro_alquiler"."tipo_cambio" > 0))),
	CONSTRAINT "cobro_alquiler_anulacion_ck" CHECK ("cobro_alquiler"."anulado" = false or ("cobro_alquiler"."anulacion_motivo" is not null and "cobro_alquiler"."anulacion_fecha" is not null and "cobro_alquiler"."anulacion_usuario_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "contrato" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"bien_id" uuid NOT NULL,
	"inquilino_id" uuid NOT NULL,
	"moneda" "moneda" DEFAULT 'ARS' NOT NULL,
	"canon_inicial" bigint NOT NULL,
	"modalidad_cobro" "modalidad_cobro" NOT NULL,
	"fecha_inicio" date,
	"fecha_fin" date,
	"periodicidad_ajuste" "periodicidad",
	"indice_referencia" text,
	"rescision_fecha" date,
	"rescision_motivo" text,
	"contrato_anterior_id" uuid,
	"dia_vencimiento" integer,
	"observaciones" text,
	CONSTRAINT "contrato_canon_ck" CHECK ("contrato"."canon_inicial" > 0),
	CONSTRAINT "contrato_fechas_ck" CHECK ("contrato"."fecha_fin" is null or "contrato"."fecha_inicio" is null or "contrato"."fecha_fin" >= "contrato"."fecha_inicio"),
	CONSTRAINT "contrato_dia_ck" CHECK ("contrato"."dia_vencimiento" is null or "contrato"."dia_vencimiento" between 1 and 31),
	CONSTRAINT "contrato_ajuste_ck" CHECK ("contrato"."periodicidad_ajuste" is null or "contrato"."periodicidad_ajuste" in ('trimestral','cuatrimestral','semestral','anual'))
);
--> statement-breakpoint
CREATE TABLE "contrato_responsabilidad" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"contrato_id" uuid NOT NULL,
	"concepto_id" uuid NOT NULL,
	"responsable" "responsable" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documento" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"entidad" "entidad_documento" NOT NULL,
	"entidad_id" uuid NOT NULL,
	"tipo" "tipo_documento" NOT NULL,
	"visible_propietario" boolean DEFAULT false NOT NULL,
	"archivo_path" text NOT NULL,
	"tipo_mime" text NOT NULL,
	"tamano_bytes" bigint NOT NULL,
	"descripcion" text,
	CONSTRAINT "documento_tamano_ck" CHECK ("documento"."tamano_bytes" > 0 and "documento"."tamano_bytes" <= 26214400),
	CONSTRAINT "documento_mime_ck" CHECK ("documento"."tipo_mime" = 'application/pdf' or "documento"."tipo_mime" like 'image/%')
);
--> statement-breakpoint
CREATE TABLE "envio" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"documento_tipo" "tipo_informe" NOT NULL,
	"documento_id" uuid NOT NULL,
	"canal" "canal_envio" NOT NULL,
	"destinatario" text NOT NULL,
	"idioma" "idioma" NOT NULL,
	"texto" text NOT NULL,
	"estado" "estado_envio" NOT NULL,
	"usuario_id" uuid NOT NULL,
	"fecha" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "indice_ipc" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"periodo" date NOT NULL,
	"variacion_mensual" numeric(9, 4) NOT NULL,
	"acumulado_anio" numeric(9, 4) NOT NULL,
	"interanual" numeric(9, 4) NOT NULL,
	"fuente" text,
	"fecha_importacion" timestamp with time zone,
	CONSTRAINT "indice_ipc_periodo_ck" CHECK (extract(day from "indice_ipc"."periodo") = 1)
);
--> statement-breakpoint
CREATE TABLE "inquilino" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"tipo_persona" "tipo_persona" DEFAULT 'humana' NOT NULL,
	"nombre_razon_social" text NOT NULL,
	"telefonos" jsonb NOT NULL,
	"emails" jsonb NOT NULL,
	"estado" "estado_activo" DEFAULT 'activo' NOT NULL,
	"documento" text,
	"idioma_informes" "idioma" DEFAULT 'es' NOT NULL,
	"avatar_path" text,
	"observaciones" text
);
--> statement-breakpoint
CREATE TABLE "liquidacion" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"propietario_id" uuid NOT NULL,
	"numero" text,
	"periodo_desde" date NOT NULL,
	"periodo_hasta" date NOT NULL,
	"estado" "estado_liquidacion" DEFAULT 'borrador' NOT NULL,
	"fecha_emision" date,
	"pdf_path" text,
	"fecha_envio" timestamp with time zone,
	"enviada_a" text,
	CONSTRAINT "liquidacion_periodo_ck" CHECK ("liquidacion"."periodo_hasta" >= "liquidacion"."periodo_desde"),
	CONSTRAINT "liquidacion_emitida_ck" CHECK ("liquidacion"."estado" = 'borrador' or ("liquidacion"."numero" is not null and "liquidacion"."fecha_emision" is not null))
);
--> statement-breakpoint
CREATE TABLE "liquidacion_total" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"liquidacion_id" uuid NOT NULL,
	"moneda" "moneda" NOT NULL,
	"total_ingresos" bigint DEFAULT 0 NOT NULL,
	"total_egresos" bigint DEFAULT 0 NOT NULL,
	"honorarios" bigint DEFAULT 0 NOT NULL,
	"saldo" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "movimiento" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"propietario_id" uuid NOT NULL,
	"bien_id" uuid NOT NULL,
	"moneda" "moneda" NOT NULL,
	"fecha" date NOT NULL,
	"tipo" "tipo_movimiento" NOT NULL,
	"debe" bigint DEFAULT 0 NOT NULL,
	"haber" bigint DEFAULT 0 NOT NULL,
	"descripcion" text NOT NULL,
	"origen_tipo" "origen_movimiento" NOT NULL,
	"origen_id" uuid,
	"liquidacion_id" uuid,
	"contramovimiento_de_id" uuid,
	"traspaso_id" uuid,
	"tipo_cambio" numeric(18, 6),
	CONSTRAINT "movimiento_importe_ck" CHECK (("movimiento"."debe" > 0 and "movimiento"."haber" = 0) or ("movimiento"."haber" > 0 and "movimiento"."debe" = 0)),
	CONSTRAINT "movimiento_origen_ck" CHECK (("movimiento"."origen_tipo" = 'manual') = ("movimiento"."origen_id" is null) or "movimiento"."tipo" = 'contramovimiento_anulacion'),
	CONSTRAINT "movimiento_traspaso_ck" CHECK ("movimiento"."tipo" <> 'traspaso_moneda' or ("movimiento"."traspaso_id" is not null and "movimiento"."tipo_cambio" > 0))
);
--> statement-breakpoint
CREATE TABLE "obligacion" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"bien_servicio_id" uuid,
	"bien_id" uuid NOT NULL,
	"concepto_id" uuid NOT NULL,
	"periodo" date NOT NULL,
	"es_recurrente" boolean DEFAULT false NOT NULL,
	"frecuencia" "periodicidad",
	"monto" bigint,
	"moneda" "moneda" DEFAULT 'ARS' NOT NULL,
	"responsable" "responsable" NOT NULL,
	"vencimiento" date,
	"descripcion" text,
	"codigo_pago" text,
	"observaciones" text,
	"anulada" boolean DEFAULT false NOT NULL,
	"anulacion_motivo" text,
	"anulacion_fecha" timestamp with time zone,
	CONSTRAINT "obligacion_periodo_ck" CHECK (extract(day from "obligacion"."periodo") = 1),
	CONSTRAINT "obligacion_recurrente_ck" CHECK ("obligacion"."es_recurrente" = false or "obligacion"."frecuencia" is not null),
	CONSTRAINT "obligacion_gasto_suelto_ck" CHECK ("obligacion"."bien_servicio_id" is not null or length(trim(coalesce("obligacion"."descripcion", ''))) > 0),
	CONSTRAINT "obligacion_monto_ck" CHECK ("obligacion"."monto" is null or "obligacion"."monto" > 0),
	CONSTRAINT "obligacion_anulacion_ck" CHECK ("obligacion"."anulada" = false or ("obligacion"."anulacion_motivo" is not null and "obligacion"."anulacion_fecha" is not null))
);
--> statement-breakpoint
CREATE TABLE "pago" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"obligacion_id" uuid NOT NULL,
	"fecha" date NOT NULL,
	"importe" bigint NOT NULL,
	"pagado_por" "pagado_por" NOT NULL,
	"medio" "medio_pago",
	"nro_operacion" text,
	"observaciones" text,
	"en_conflicto" boolean DEFAULT false NOT NULL,
	"anulado" boolean DEFAULT false NOT NULL,
	"anulacion_motivo" text,
	"anulacion_fecha" timestamp with time zone,
	"anulacion_usuario_id" uuid,
	CONSTRAINT "pago_importe_ck" CHECK ("pago"."importe" > 0),
	CONSTRAINT "pago_anulacion_ck" CHECK ("pago"."anulado" = false or ("pago"."anulacion_motivo" is not null and "pago"."anulacion_fecha" is not null and "pago"."anulacion_usuario_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "plantilla_envio" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"documento" "tipo_informe" NOT NULL,
	"canal" "canal_plantilla" NOT NULL,
	"idioma" "idioma" NOT NULL,
	"asunto" text,
	"cuerpo" text NOT NULL,
	CONSTRAINT "plantilla_envio_asunto_ck" CHECK ("plantilla_envio"."canal" <> 'email' or length(trim(coalesce("plantilla_envio"."asunto", ''))) > 0)
);
--> statement-breakpoint
CREATE TABLE "resumen_deposito" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"propietario_id" uuid NOT NULL,
	"numero" text NOT NULL,
	"fecha" date NOT NULL,
	"horizonte_dias" integer NOT NULL,
	"fecha_limite" date NOT NULL,
	"pdf_path" text,
	CONSTRAINT "resumen_deposito_horizonte_ck" CHECK ("resumen_deposito"."horizonte_dias" > 0)
);
--> statement-breakpoint
CREATE TABLE "resumen_deposito_monto" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"resumen_deposito_id" uuid NOT NULL,
	"moneda" "moneda" NOT NULL,
	"obligaciones_pendientes" bigint DEFAULT 0 NOT NULL,
	"saldo_disponible" bigint DEFAULT 0 NOT NULL,
	"reposicion_fondo" bigint DEFAULT 0 NOT NULL,
	"a_depositar" bigint DEFAULT 0 NOT NULL,
	"saldo_a_transferir" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "resumen_deposito_monto_ck" CHECK ("resumen_deposito_monto"."a_depositar" >= 0 and "resumen_deposito_monto"."saldo_a_transferir" >= 0)
);
--> statement-breakpoint
ALTER TABLE "canon_tramo" ADD CONSTRAINT "canon_tramo_organizacion_id_organizacion_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizacion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canon_tramo" ADD CONSTRAINT "canon_tramo_contrato_id_contrato_id_fk" FOREIGN KEY ("contrato_id") REFERENCES "public"."contrato"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cobro_alquiler" ADD CONSTRAINT "cobro_alquiler_organizacion_id_organizacion_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizacion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cobro_alquiler" ADD CONSTRAINT "cobro_alquiler_contrato_id_contrato_id_fk" FOREIGN KEY ("contrato_id") REFERENCES "public"."contrato"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cobro_alquiler" ADD CONSTRAINT "cobro_alquiler_anulacion_usuario_id_usuario_id_fk" FOREIGN KEY ("anulacion_usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contrato" ADD CONSTRAINT "contrato_organizacion_id_organizacion_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizacion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contrato" ADD CONSTRAINT "contrato_bien_id_bien_id_fk" FOREIGN KEY ("bien_id") REFERENCES "public"."bien"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contrato" ADD CONSTRAINT "contrato_inquilino_id_inquilino_id_fk" FOREIGN KEY ("inquilino_id") REFERENCES "public"."inquilino"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contrato" ADD CONSTRAINT "contrato_contrato_anterior_id_contrato_id_fk" FOREIGN KEY ("contrato_anterior_id") REFERENCES "public"."contrato"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contrato_responsabilidad" ADD CONSTRAINT "contrato_responsabilidad_organizacion_id_organizacion_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizacion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contrato_responsabilidad" ADD CONSTRAINT "contrato_responsabilidad_contrato_id_contrato_id_fk" FOREIGN KEY ("contrato_id") REFERENCES "public"."contrato"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contrato_responsabilidad" ADD CONSTRAINT "contrato_responsabilidad_concepto_id_concepto_id_fk" FOREIGN KEY ("concepto_id") REFERENCES "public"."concepto"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documento" ADD CONSTRAINT "documento_organizacion_id_organizacion_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizacion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "envio" ADD CONSTRAINT "envio_organizacion_id_organizacion_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizacion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "envio" ADD CONSTRAINT "envio_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indice_ipc" ADD CONSTRAINT "indice_ipc_organizacion_id_organizacion_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizacion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquilino" ADD CONSTRAINT "inquilino_organizacion_id_organizacion_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizacion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "liquidacion" ADD CONSTRAINT "liquidacion_organizacion_id_organizacion_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizacion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "liquidacion" ADD CONSTRAINT "liquidacion_propietario_id_propietario_id_fk" FOREIGN KEY ("propietario_id") REFERENCES "public"."propietario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "liquidacion_total" ADD CONSTRAINT "liquidacion_total_organizacion_id_organizacion_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizacion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "liquidacion_total" ADD CONSTRAINT "liquidacion_total_liquidacion_id_liquidacion_id_fk" FOREIGN KEY ("liquidacion_id") REFERENCES "public"."liquidacion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimiento" ADD CONSTRAINT "movimiento_organizacion_id_organizacion_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizacion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimiento" ADD CONSTRAINT "movimiento_propietario_id_propietario_id_fk" FOREIGN KEY ("propietario_id") REFERENCES "public"."propietario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimiento" ADD CONSTRAINT "movimiento_bien_id_bien_id_fk" FOREIGN KEY ("bien_id") REFERENCES "public"."bien"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimiento" ADD CONSTRAINT "movimiento_liquidacion_id_liquidacion_id_fk" FOREIGN KEY ("liquidacion_id") REFERENCES "public"."liquidacion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimiento" ADD CONSTRAINT "movimiento_contramovimiento_de_id_movimiento_id_fk" FOREIGN KEY ("contramovimiento_de_id") REFERENCES "public"."movimiento"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obligacion" ADD CONSTRAINT "obligacion_organizacion_id_organizacion_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizacion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obligacion" ADD CONSTRAINT "obligacion_bien_servicio_id_bien_servicio_id_fk" FOREIGN KEY ("bien_servicio_id") REFERENCES "public"."bien_servicio"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obligacion" ADD CONSTRAINT "obligacion_bien_id_bien_id_fk" FOREIGN KEY ("bien_id") REFERENCES "public"."bien"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obligacion" ADD CONSTRAINT "obligacion_concepto_id_concepto_id_fk" FOREIGN KEY ("concepto_id") REFERENCES "public"."concepto"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pago" ADD CONSTRAINT "pago_organizacion_id_organizacion_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizacion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pago" ADD CONSTRAINT "pago_obligacion_id_obligacion_id_fk" FOREIGN KEY ("obligacion_id") REFERENCES "public"."obligacion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pago" ADD CONSTRAINT "pago_anulacion_usuario_id_usuario_id_fk" FOREIGN KEY ("anulacion_usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plantilla_envio" ADD CONSTRAINT "plantilla_envio_organizacion_id_organizacion_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizacion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resumen_deposito" ADD CONSTRAINT "resumen_deposito_organizacion_id_organizacion_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizacion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resumen_deposito" ADD CONSTRAINT "resumen_deposito_propietario_id_propietario_id_fk" FOREIGN KEY ("propietario_id") REFERENCES "public"."propietario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resumen_deposito_monto" ADD CONSTRAINT "resumen_deposito_monto_organizacion_id_organizacion_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizacion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resumen_deposito_monto" ADD CONSTRAINT "resumen_deposito_monto_resumen_deposito_id_resumen_deposito_id_fk" FOREIGN KEY ("resumen_deposito_id") REFERENCES "public"."resumen_deposito"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "canon_tramo_organizacion_idx" ON "canon_tramo" USING btree ("organizacion_id");--> statement-breakpoint
CREATE UNIQUE INDEX "canon_tramo_uq" ON "canon_tramo" USING btree ("contrato_id","vigente_desde") WHERE "canon_tramo"."deleted_at" is null and "canon_tramo"."vigente_desde" is not null;--> statement-breakpoint
CREATE INDEX "cobro_alquiler_organizacion_idx" ON "cobro_alquiler" USING btree ("organizacion_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cobro_alquiler_periodo_uq" ON "cobro_alquiler" USING btree ("contrato_id","periodo") WHERE "cobro_alquiler"."deleted_at" is null and "cobro_alquiler"."anulado" = false and "cobro_alquiler"."en_conflicto" = false;--> statement-breakpoint
CREATE UNIQUE INDEX "cobro_alquiler_recibo_uq" ON "cobro_alquiler" USING btree ("organizacion_id","recibo_numero") WHERE "cobro_alquiler"."recibo_numero" is not null;--> statement-breakpoint
CREATE INDEX "contrato_organizacion_idx" ON "contrato" USING btree ("organizacion_id");--> statement-breakpoint
CREATE INDEX "contrato_bien_idx" ON "contrato" USING btree ("bien_id");--> statement-breakpoint
CREATE INDEX "contrato_inquilino_idx" ON "contrato" USING btree ("inquilino_id");--> statement-breakpoint
CREATE INDEX "contrato_responsabilidad_organizacion_idx" ON "contrato_responsabilidad" USING btree ("organizacion_id");--> statement-breakpoint
CREATE UNIQUE INDEX "contrato_responsabilidad_uq" ON "contrato_responsabilidad" USING btree ("contrato_id","concepto_id") WHERE "contrato_responsabilidad"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "documento_organizacion_idx" ON "documento" USING btree ("organizacion_id");--> statement-breakpoint
CREATE INDEX "documento_entidad_idx" ON "documento" USING btree ("entidad","entidad_id");--> statement-breakpoint
CREATE INDEX "envio_organizacion_idx" ON "envio" USING btree ("organizacion_id");--> statement-breakpoint
CREATE INDEX "envio_documento_idx" ON "envio" USING btree ("documento_tipo","documento_id");--> statement-breakpoint
CREATE INDEX "indice_ipc_organizacion_idx" ON "indice_ipc" USING btree ("organizacion_id");--> statement-breakpoint
CREATE UNIQUE INDEX "indice_ipc_periodo_uq" ON "indice_ipc" USING btree ("organizacion_id","periodo") WHERE "indice_ipc"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "inquilino_organizacion_idx" ON "inquilino" USING btree ("organizacion_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inquilino_documento_uq" ON "inquilino" USING btree ("documento") WHERE "inquilino"."deleted_at" is null and "inquilino"."documento" is not null;--> statement-breakpoint
CREATE INDEX "liquidacion_organizacion_idx" ON "liquidacion" USING btree ("organizacion_id");--> statement-breakpoint
CREATE INDEX "liquidacion_propietario_idx" ON "liquidacion" USING btree ("propietario_id");--> statement-breakpoint
CREATE UNIQUE INDEX "liquidacion_numero_uq" ON "liquidacion" USING btree ("organizacion_id","numero") WHERE "liquidacion"."numero" is not null;--> statement-breakpoint
CREATE INDEX "liquidacion_total_organizacion_idx" ON "liquidacion_total" USING btree ("organizacion_id");--> statement-breakpoint
CREATE UNIQUE INDEX "liquidacion_total_uq" ON "liquidacion_total" USING btree ("liquidacion_id","moneda") WHERE "liquidacion_total"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "movimiento_organizacion_idx" ON "movimiento" USING btree ("organizacion_id");--> statement-breakpoint
CREATE INDEX "movimiento_saldo_idx" ON "movimiento" USING btree ("propietario_id","moneda","fecha");--> statement-breakpoint
CREATE INDEX "movimiento_bien_idx" ON "movimiento" USING btree ("bien_id");--> statement-breakpoint
CREATE INDEX "movimiento_liquidacion_idx" ON "movimiento" USING btree ("liquidacion_id");--> statement-breakpoint
CREATE UNIQUE INDEX "movimiento_contramovimiento_uq" ON "movimiento" USING btree ("contramovimiento_de_id") WHERE "movimiento"."contramovimiento_de_id" is not null;--> statement-breakpoint
CREATE INDEX "obligacion_organizacion_idx" ON "obligacion" USING btree ("organizacion_id");--> statement-breakpoint
CREATE INDEX "obligacion_bien_periodo_idx" ON "obligacion" USING btree ("bien_id","periodo");--> statement-breakpoint
CREATE INDEX "obligacion_vencimiento_idx" ON "obligacion" USING btree ("vencimiento");--> statement-breakpoint
CREATE UNIQUE INDEX "obligacion_servicio_periodo_uq" ON "obligacion" USING btree ("bien_servicio_id","periodo") WHERE "obligacion"."deleted_at" is null and "obligacion"."anulada" = false and "obligacion"."bien_servicio_id" is not null;--> statement-breakpoint
CREATE INDEX "pago_organizacion_idx" ON "pago" USING btree ("organizacion_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pago_obligacion_uq" ON "pago" USING btree ("obligacion_id") WHERE "pago"."deleted_at" is null and "pago"."anulado" = false and "pago"."en_conflicto" = false;--> statement-breakpoint
CREATE INDEX "plantilla_envio_organizacion_idx" ON "plantilla_envio" USING btree ("organizacion_id");--> statement-breakpoint
CREATE UNIQUE INDEX "plantilla_envio_uq" ON "plantilla_envio" USING btree ("organizacion_id","documento","canal","idioma") WHERE "plantilla_envio"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "resumen_deposito_organizacion_idx" ON "resumen_deposito" USING btree ("organizacion_id");--> statement-breakpoint
CREATE INDEX "resumen_deposito_propietario_idx" ON "resumen_deposito" USING btree ("propietario_id");--> statement-breakpoint
CREATE UNIQUE INDEX "resumen_deposito_numero_uq" ON "resumen_deposito" USING btree ("organizacion_id","numero");--> statement-breakpoint
CREATE INDEX "resumen_deposito_monto_organizacion_idx" ON "resumen_deposito_monto" USING btree ("organizacion_id");--> statement-breakpoint
CREATE UNIQUE INDEX "resumen_deposito_monto_uq" ON "resumen_deposito_monto" USING btree ("resumen_deposito_id","moneda") WHERE "resumen_deposito_monto"."deleted_at" is null;