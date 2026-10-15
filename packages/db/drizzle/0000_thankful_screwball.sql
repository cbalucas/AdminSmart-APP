CREATE TYPE "public"."apariencia" AS ENUM('claro', 'oscuro', 'automatico');--> statement-breakpoint
CREATE TYPE "public"."canal_notificaciones" AS ENUM('push', 'email', 'ambos');--> statement-breakpoint
CREATE TYPE "public"."categoria_concepto" AS ENUM('servicio', 'impuesto', 'tasa', 'expensa', 'seguro', 'otro');--> statement-breakpoint
CREATE TYPE "public"."estado_activo" AS ENUM('activo', 'inactivo');--> statement-breakpoint
CREATE TYPE "public"."estado_bien" AS ENUM('disponible', 'alquilado', 'en_refaccion', 'vendido', 'activo', 'de_baja');--> statement-breakpoint
CREATE TYPE "public"."estado_usuario" AS ENUM('activo', 'inactivo', 'pendiente');--> statement-breakpoint
CREATE TYPE "public"."idioma" AS ENUM('es', 'en', 'pt');--> statement-breakpoint
CREATE TYPE "public"."modalidad_honorarios" AS ENUM('porcentaje', 'monto_fijo');--> statement-breakpoint
CREATE TYPE "public"."modalidad_reparto" AS ENUM('segun_porcentaje', 'un_solo_propietario', 'personalizado');--> statement-breakpoint
CREATE TYPE "public"."modo_honorarios" AS ENUM('sobre_parte_de_cada_titular', 'sobre_total_al_representante');--> statement-breakpoint
CREATE TYPE "public"."modo_liquidacion" AS ENUM('por_separado', 'al_representante');--> statement-breakpoint
CREATE TYPE "public"."moneda" AS ENUM('ARS', 'USD');--> statement-breakpoint
CREATE TYPE "public"."periodicidad" AS ENUM('mensual', 'bimestral', 'trimestral', 'cuatrimestral', 'semestral', 'anual');--> statement-breakpoint
CREATE TYPE "public"."politica_doble_factor" AS ENUM('desactivado', 'opcional', 'obligatorio');--> statement-breakpoint
CREATE TYPE "public"."responsable" AS ENUM('propietario', 'inquilino');--> statement-breakpoint
CREATE TYPE "public"."rol" AS ENUM('administrador', 'operador', 'propietario', 'inquilino');--> statement-breakpoint
CREATE TYPE "public"."tipo_bien" AS ENUM('inmueble', 'terreno', 'vehiculo', 'otros');--> statement-breakpoint
CREATE TYPE "public"."tipo_cuenta" AS ENUM('caja_ahorro', 'cuenta_corriente', 'billetera');--> statement-breakpoint
CREATE TYPE "public"."tipo_persona" AS ENUM('humana', 'juridica');--> statement-breakpoint
CREATE TABLE "acuerdo_honorarios" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"propietario_id" uuid NOT NULL,
	"modalidad" "modalidad_honorarios" NOT NULL,
	"porcentaje" numeric(7, 4),
	"monto_fijo" bigint,
	"moneda" "moneda",
	"incluye_cobros_directos" boolean DEFAULT false NOT NULL,
	"vigente_desde" date NOT NULL,
	"vigente_hasta" date,
	CONSTRAINT "acuerdo_honorarios_valor_ck" CHECK (("acuerdo_honorarios"."modalidad" = 'porcentaje' and "acuerdo_honorarios"."porcentaje" is not null and "acuerdo_honorarios"."porcentaje" between 0 and 100 and "acuerdo_honorarios"."monto_fijo" is null)
       or ("acuerdo_honorarios"."modalidad" = 'monto_fijo' and "acuerdo_honorarios"."monto_fijo" is not null and "acuerdo_honorarios"."monto_fijo" >= 0 and "acuerdo_honorarios"."moneda" is not null and "acuerdo_honorarios"."porcentaje" is null)),
	CONSTRAINT "acuerdo_honorarios_vigencia_ck" CHECK ("acuerdo_honorarios"."vigente_hasta" is null or "acuerdo_honorarios"."vigente_hasta" >= "acuerdo_honorarios"."vigente_desde")
);
--> statement-breakpoint
CREATE TABLE "bien" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"tipo_bien" "tipo_bien" NOT NULL,
	"subtipo" text,
	"alias" text NOT NULL,
	"calle" text,
	"numero" text,
	"piso" text,
	"departamento" text,
	"localidad" text,
	"provincia" text,
	"codigo_postal" text,
	"latitud" numeric(9, 6),
	"longitud" numeric(9, 6),
	"dominio" text,
	"marca_modelo" text,
	"anio" integer,
	"estado" "estado_bien" NOT NULL,
	"edificio_id" uuid,
	"unidad_funcional" text,
	"modo_liquidacion" "modo_liquidacion" DEFAULT 'por_separado' NOT NULL,
	"modo_honorarios" "modo_honorarios" DEFAULT 'sobre_parte_de_cada_titular' NOT NULL,
	"es_gastos_varios" boolean DEFAULT false NOT NULL,
	"observaciones" text,
	CONSTRAINT "bien_vehiculo_dominio_ck" CHECK ("bien"."tipo_bien" <> 'vehiculo' or "bien"."dominio" is not null),
	CONSTRAINT "bien_direccion_ck" CHECK ("bien"."tipo_bien" not in ('inmueble','terreno') or "bien"."edificio_id" is not null
        or ("bien"."calle" is not null and "bien"."numero" is not null and "bien"."localidad" is not null and "bien"."provincia" is not null)),
	CONSTRAINT "bien_subtipo_ck" CHECK ("bien"."tipo_bien" not in ('inmueble','vehiculo') or "bien"."subtipo" is not null),
	CONSTRAINT "bien_estado_ck" CHECK (("bien"."tipo_bien" in ('inmueble','terreno') and "bien"."estado" in ('disponible','alquilado','en_refaccion','vendido'))
       or ("bien"."tipo_bien" = 'vehiculo' and "bien"."estado" in ('activo','vendido'))
       or ("bien"."tipo_bien" = 'otros' and "bien"."estado" in ('activo','de_baja'))),
	CONSTRAINT "bien_coordenadas_ck" CHECK (("bien"."latitud" is null) = ("bien"."longitud" is null))
);
--> statement-breakpoint
CREATE TABLE "bien_propietario" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"bien_id" uuid NOT NULL,
	"propietario_id" uuid NOT NULL,
	"porcentaje" numeric(7, 4) NOT NULL,
	"es_representante" boolean DEFAULT false NOT NULL,
	"observaciones" text,
	CONSTRAINT "bien_propietario_porcentaje_ck" CHECK ("bien_propietario"."porcentaje" > 0 and "bien_propietario"."porcentaje" <= 100)
);
--> statement-breakpoint
CREATE TABLE "bien_servicio" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"bien_id" uuid NOT NULL,
	"concepto_id" uuid NOT NULL,
	"nro_cuenta_cliente" text NOT NULL,
	"empresa_prestadora" text NOT NULL,
	"responsable_default" "responsable" NOT NULL,
	"estado" "estado_activo" DEFAULT 'activo' NOT NULL,
	"titular_servicio" text,
	"periodicidad" "periodicidad",
	"dia_vencimiento" integer,
	"monto_estimado" bigint,
	"monto_estimado_moneda" "moneda",
	"debito_automatico" boolean DEFAULT false NOT NULL,
	"sitio_boletas" text,
	"observaciones" text,
	CONSTRAINT "bien_servicio_dia_ck" CHECK ("bien_servicio"."dia_vencimiento" is null or "bien_servicio"."dia_vencimiento" between 1 and 31),
	CONSTRAINT "bien_servicio_monto_ck" CHECK (("bien_servicio"."monto_estimado" is null) = ("bien_servicio"."monto_estimado_moneda" is null))
);
--> statement-breakpoint
CREATE TABLE "concepto" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"categoria" "categoria_concepto" NOT NULL,
	"estado" "estado_activo" DEFAULT 'activo' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cuenta_bancaria" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"banco" text NOT NULL,
	"tipo_cuenta" "tipo_cuenta" NOT NULL,
	"moneda" "moneda" DEFAULT 'ARS' NOT NULL,
	"cbu_cvu" text NOT NULL,
	"alias" text,
	"titular" text NOT NULL,
	"estado" "estado_activo" DEFAULT 'activo' NOT NULL,
	CONSTRAINT "cuenta_bancaria_cbu_ck" CHECK ("cuenta_bancaria"."cbu_cvu" ~ '^[0-9]{22}$')
);
--> statement-breakpoint
CREATE TABLE "edificio" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"calle" text NOT NULL,
	"numero" text NOT NULL,
	"localidad" text NOT NULL,
	"provincia" text NOT NULL,
	"codigo_postal" text,
	"observaciones" text
);
--> statement-breakpoint
CREATE TABLE "organizacion" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"nombre" text NOT NULL,
	"logo_path" text,
	"cuit" text,
	"contacto_telefono" text,
	"contacto_email" text,
	"contacto_direccion" text,
	"cuenta_deposito_banco" text,
	"cuenta_deposito_titular" text,
	"cuenta_deposito_cbu" text,
	"cuenta_deposito_alias" text,
	"email_envio" text,
	"idioma_defecto" "idioma" DEFAULT 'es' NOT NULL,
	"moneda_defecto" "moneda" DEFAULT 'ARS' NOT NULL,
	"dias_aviso_recurrentes" integer DEFAULT 5 NOT NULL,
	"politica_doble_factor" "politica_doble_factor" DEFAULT 'desactivado' NOT NULL,
	"registro_abierto_habilitado" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "propietario" (
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
	"apoderado_nombre" text,
	"apoderado_contacto" text,
	"periodicidad_liquidacion" text DEFAULT 'mensual' NOT NULL,
	"dia_liquidacion" integer,
	"horizonte_resumen_dias" integer DEFAULT 30 NOT NULL,
	"fondo_reserva_ars" bigint,
	"fondo_reserva_usd" bigint,
	"idioma_informes" "idioma" DEFAULT 'es' NOT NULL,
	"avatar_path" text,
	"observaciones" text,
	CONSTRAINT "propietario_horizonte_ck" CHECK ("propietario"."horizonte_resumen_dias" > 0),
	CONSTRAINT "propietario_dia_liquidacion_ck" CHECK ("propietario"."dia_liquidacion" is null or "propietario"."dia_liquidacion" between 1 and 31)
);
--> statement-breakpoint
CREATE TABLE "propietario_cuenta" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"propietario_id" uuid NOT NULL,
	"cuenta_bancaria_id" uuid NOT NULL,
	"predeterminada" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reparto_concepto" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"bien_id" uuid NOT NULL,
	"concepto_id" uuid,
	"aplica_a_alquiler" boolean DEFAULT false NOT NULL,
	"modalidad" "modalidad_reparto" NOT NULL,
	"propietario_id" uuid,
	CONSTRAINT "reparto_concepto_destino_ck" CHECK (("reparto_concepto"."concepto_id" is not null) <> "reparto_concepto"."aplica_a_alquiler"),
	CONSTRAINT "reparto_concepto_propietario_ck" CHECK (("reparto_concepto"."modalidad" = 'un_solo_propietario') = ("reparto_concepto"."propietario_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "reparto_concepto_porcentaje" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"reparto_concepto_id" uuid NOT NULL,
	"propietario_id" uuid NOT NULL,
	"porcentaje" numeric(7, 4) NOT NULL,
	CONSTRAINT "reparto_concepto_porcentaje_ck" CHECK ("reparto_concepto_porcentaje"."porcentaje" > 0 and "reparto_concepto_porcentaje"."porcentaje" <= 100)
);
--> statement-breakpoint
CREATE TABLE "usuario" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"email" text NOT NULL,
	"roles" "rol"[] NOT NULL,
	"propietario_id" uuid,
	"estado" "estado_usuario" DEFAULT 'activo' NOT NULL,
	"telefono" text,
	"canal_notificaciones" "canal_notificaciones" DEFAULT 'ambos' NOT NULL,
	"idioma_app" "idioma",
	"apariencia" "apariencia" DEFAULT 'automatico' NOT NULL,
	"doble_factor" boolean DEFAULT false NOT NULL,
	CONSTRAINT "usuario_roles_ck" CHECK (cardinality("usuario"."roles") > 0),
	CONSTRAINT "usuario_rol_propietario_ck" CHECK (not ('propietario' = any("usuario"."roles")) or "usuario"."propietario_id" is not null)
);
--> statement-breakpoint
CREATE TABLE "usuario_bien" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"bien_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "acuerdo_honorarios" ADD CONSTRAINT "acuerdo_honorarios_organizacion_id_organizacion_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizacion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acuerdo_honorarios" ADD CONSTRAINT "acuerdo_honorarios_propietario_id_propietario_id_fk" FOREIGN KEY ("propietario_id") REFERENCES "public"."propietario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bien" ADD CONSTRAINT "bien_organizacion_id_organizacion_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizacion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bien" ADD CONSTRAINT "bien_edificio_id_edificio_id_fk" FOREIGN KEY ("edificio_id") REFERENCES "public"."edificio"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bien_propietario" ADD CONSTRAINT "bien_propietario_organizacion_id_organizacion_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizacion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bien_propietario" ADD CONSTRAINT "bien_propietario_bien_id_bien_id_fk" FOREIGN KEY ("bien_id") REFERENCES "public"."bien"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bien_propietario" ADD CONSTRAINT "bien_propietario_propietario_id_propietario_id_fk" FOREIGN KEY ("propietario_id") REFERENCES "public"."propietario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bien_servicio" ADD CONSTRAINT "bien_servicio_organizacion_id_organizacion_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizacion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bien_servicio" ADD CONSTRAINT "bien_servicio_bien_id_bien_id_fk" FOREIGN KEY ("bien_id") REFERENCES "public"."bien"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bien_servicio" ADD CONSTRAINT "bien_servicio_concepto_id_concepto_id_fk" FOREIGN KEY ("concepto_id") REFERENCES "public"."concepto"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concepto" ADD CONSTRAINT "concepto_organizacion_id_organizacion_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizacion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuenta_bancaria" ADD CONSTRAINT "cuenta_bancaria_organizacion_id_organizacion_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizacion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edificio" ADD CONSTRAINT "edificio_organizacion_id_organizacion_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizacion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "propietario" ADD CONSTRAINT "propietario_organizacion_id_organizacion_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizacion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "propietario_cuenta" ADD CONSTRAINT "propietario_cuenta_organizacion_id_organizacion_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizacion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "propietario_cuenta" ADD CONSTRAINT "propietario_cuenta_propietario_id_propietario_id_fk" FOREIGN KEY ("propietario_id") REFERENCES "public"."propietario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "propietario_cuenta" ADD CONSTRAINT "propietario_cuenta_cuenta_bancaria_id_cuenta_bancaria_id_fk" FOREIGN KEY ("cuenta_bancaria_id") REFERENCES "public"."cuenta_bancaria"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reparto_concepto" ADD CONSTRAINT "reparto_concepto_organizacion_id_organizacion_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizacion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reparto_concepto" ADD CONSTRAINT "reparto_concepto_bien_id_bien_id_fk" FOREIGN KEY ("bien_id") REFERENCES "public"."bien"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reparto_concepto" ADD CONSTRAINT "reparto_concepto_concepto_id_concepto_id_fk" FOREIGN KEY ("concepto_id") REFERENCES "public"."concepto"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reparto_concepto" ADD CONSTRAINT "reparto_concepto_propietario_id_propietario_id_fk" FOREIGN KEY ("propietario_id") REFERENCES "public"."propietario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reparto_concepto_porcentaje" ADD CONSTRAINT "reparto_concepto_porcentaje_organizacion_id_organizacion_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizacion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reparto_concepto_porcentaje" ADD CONSTRAINT "reparto_concepto_porcentaje_reparto_concepto_id_reparto_concepto_id_fk" FOREIGN KEY ("reparto_concepto_id") REFERENCES "public"."reparto_concepto"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reparto_concepto_porcentaje" ADD CONSTRAINT "reparto_concepto_porcentaje_propietario_id_propietario_id_fk" FOREIGN KEY ("propietario_id") REFERENCES "public"."propietario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_organizacion_id_organizacion_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizacion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_propietario_id_propietario_id_fk" FOREIGN KEY ("propietario_id") REFERENCES "public"."propietario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuario_bien" ADD CONSTRAINT "usuario_bien_organizacion_id_organizacion_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizacion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuario_bien" ADD CONSTRAINT "usuario_bien_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuario_bien" ADD CONSTRAINT "usuario_bien_bien_id_bien_id_fk" FOREIGN KEY ("bien_id") REFERENCES "public"."bien"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "acuerdo_honorarios_propietario_idx" ON "acuerdo_honorarios" USING btree ("propietario_id");--> statement-breakpoint
CREATE INDEX "bien_organizacion_idx" ON "bien" USING btree ("organizacion_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bien_alias_uq" ON "bien" USING btree (lower("alias")) WHERE "bien"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "bien_dominio_uq" ON "bien" USING btree (upper("dominio")) WHERE "bien"."deleted_at" is null and "bien"."dominio" is not null;--> statement-breakpoint
CREATE INDEX "bien_propietario_organizacion_idx" ON "bien_propietario" USING btree ("organizacion_id");--> statement-breakpoint
CREATE INDEX "bien_propietario_propietario_idx" ON "bien_propietario" USING btree ("propietario_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bien_propietario_uq" ON "bien_propietario" USING btree ("bien_id","propietario_id") WHERE "bien_propietario"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "bien_servicio_organizacion_idx" ON "bien_servicio" USING btree ("organizacion_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bien_servicio_uq" ON "bien_servicio" USING btree ("bien_id","concepto_id") WHERE "bien_servicio"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "concepto_organizacion_idx" ON "concepto" USING btree ("organizacion_id");--> statement-breakpoint
CREATE UNIQUE INDEX "concepto_nombre_uq" ON "concepto" USING btree (lower("nombre")) WHERE "concepto"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "cuenta_bancaria_organizacion_idx" ON "cuenta_bancaria" USING btree ("organizacion_id");--> statement-breakpoint
CREATE INDEX "edificio_organizacion_idx" ON "edificio" USING btree ("organizacion_id");--> statement-breakpoint
CREATE INDEX "propietario_organizacion_idx" ON "propietario" USING btree ("organizacion_id");--> statement-breakpoint
CREATE INDEX "propietario_cuenta_organizacion_idx" ON "propietario_cuenta" USING btree ("organizacion_id");--> statement-breakpoint
CREATE UNIQUE INDEX "propietario_cuenta_uq" ON "propietario_cuenta" USING btree ("propietario_id","cuenta_bancaria_id") WHERE "propietario_cuenta"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "reparto_concepto_organizacion_idx" ON "reparto_concepto" USING btree ("organizacion_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reparto_concepto_uq" ON "reparto_concepto" USING btree ("bien_id",coalesce("concepto_id", '00000000-0000-0000-0000-000000000000'::uuid)) WHERE "reparto_concepto"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "reparto_concepto_porcentaje_organizacion_idx" ON "reparto_concepto_porcentaje" USING btree ("organizacion_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reparto_concepto_porcentaje_uq" ON "reparto_concepto_porcentaje" USING btree ("reparto_concepto_id","propietario_id") WHERE "reparto_concepto_porcentaje"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "usuario_organizacion_idx" ON "usuario" USING btree ("organizacion_id");--> statement-breakpoint
CREATE UNIQUE INDEX "usuario_email_uq" ON "usuario" USING btree (lower("email")) WHERE "usuario"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "usuario_propietario_uq" ON "usuario" USING btree ("propietario_id") WHERE "usuario"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "usuario_bien_organizacion_idx" ON "usuario_bien" USING btree ("organizacion_id");--> statement-breakpoint
CREATE UNIQUE INDEX "usuario_bien_uq" ON "usuario_bien" USING btree ("usuario_id","bien_id") WHERE "usuario_bien"."deleted_at" is null;