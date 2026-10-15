// Bloque 3 del esquema: tablas de control. La numeración correlativa y la auditoría las
// escriben solo triggers y funciones del servidor; ningún cliente las modifica.
import { sql } from "drizzle-orm";
import { check, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { columnasBase } from "./comunes";
import { organizacionId } from "./esquema-base";
import { tipoInforme } from "./esquema-operacion";

export const accionAuditoria = pgEnum("accion_auditoria", ["alta", "modificacion", "anulacion", "reapertura"]);

// Numeración por tipo y año, correlativa y sin reutilizar: LIQ-AAAA-NNNN, DEP-AAAA-NNNN, REC-AAAA-NNNN.
export const numeracion = pgTable(
  "numeracion",
  {
    ...columnasBase(),
    organizacionId: organizacionId(),
    tipo: tipoInforme("tipo").notNull(),
    anio: integer("anio").notNull(),
    ultimoNumero: integer("ultimo_numero").notNull().default(0),
  },
  (t) => [
    uniqueIndex("numeracion_uq").on(t.organizacionId, t.tipo, t.anio),
    check("numeracion_anio_ck", sql`${t.anio} between 2000 and 2999`),
  ],
).enableRLS();

// 17. Auditoría: nadie la edita ni la borra (AUD-02). El `bien_id` permite que el operador
// vea solo lo referido a sus bienes (AUD-01).
export const auditoria = pgTable(
  "auditoria",
  {
    ...columnasBase(),
    organizacionId: organizacionId(),
    tabla: text("tabla").notNull(),
    registroId: uuid("registro_id").notNull(),
    bienId: uuid("bien_id"),
    accion: accionAuditoria("accion").notNull(),
    valoresAntes: jsonb("valores_antes"),
    valoresDespues: jsonb("valores_despues"),
    usuarioId: uuid("usuario_id"),
    fecha: timestamp("fecha", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("auditoria_organizacion_fecha_idx").on(t.organizacionId, t.fecha),
    index("auditoria_registro_idx").on(t.tabla, t.registroId),
    index("auditoria_bien_idx").on(t.bienId),
  ],
).enableRLS();
