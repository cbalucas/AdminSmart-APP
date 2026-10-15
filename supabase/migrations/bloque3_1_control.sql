CREATE TYPE "public"."accion_auditoria" AS ENUM('alta', 'modificacion', 'anulacion', 'reapertura');
CREATE TABLE "auditoria" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"tabla" text NOT NULL,
	"registro_id" uuid NOT NULL,
	"bien_id" uuid,
	"accion" "accion_auditoria" NOT NULL,
	"valores_antes" jsonb,
	"valores_despues" jsonb,
	"usuario_id" uuid,
	"fecha" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "auditoria" ENABLE ROW LEVEL SECURITY;
CREATE TABLE "numeracion" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"tipo" "tipo_informe" NOT NULL,
	"anio" integer NOT NULL,
	"ultimo_numero" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "numeracion_anio_ck" CHECK ("numeracion"."anio" between 2000 and 2999)
);

ALTER TABLE "numeracion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_organizacion_id_organizacion_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizacion"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "numeracion" ADD CONSTRAINT "numeracion_organizacion_id_organizacion_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizacion"("id") ON DELETE no action ON UPDATE no action;
CREATE INDEX "auditoria_organizacion_fecha_idx" ON "auditoria" USING btree ("organizacion_id","fecha");
CREATE INDEX "auditoria_registro_idx" ON "auditoria" USING btree ("tabla","registro_id");
CREATE INDEX "auditoria_bien_idx" ON "auditoria" USING btree ("bien_id");
CREATE UNIQUE INDEX "numeracion_uq" ON "numeracion" USING btree ("organizacion_id","tipo","anio");