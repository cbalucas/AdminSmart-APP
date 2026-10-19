import { bigint, integer, pgEnum, timestamp, uuid } from "drizzle-orm/pg-core";
import { v7 } from "uuid";

// Identificador UUID v7 generado en el cliente (permite crear registros sin conexión).
export const nuevoId = (): string => v7();

// Valores de los listados cerrados del diccionario de datos. Sin tildes, en snake_case.
export const tipoPersona = pgEnum("tipo_persona", ["humana", "juridica"]);
export const idioma = pgEnum("idioma", ["es", "en", "pt"]);
export const moneda = pgEnum("moneda", ["ARS", "USD"]);
export const responsable = pgEnum("responsable", ["propietario", "inquilino"]);
export const rol = pgEnum("rol", ["administrador", "operador", "propietario", "inquilino"]);
export const estadoUsuario = pgEnum("estado_usuario", ["activo", "inactivo", "pendiente"]);
export const estadoActivo = pgEnum("estado_activo", ["activo", "inactivo"]);
export const canalNotificaciones = pgEnum("canal_notificaciones", ["push", "email", "ambos"]);
export const apariencia = pgEnum("apariencia", ["claro", "oscuro", "automatico"]);
export const politicaDobleFactor = pgEnum("politica_doble_factor", ["desactivado", "opcional", "obligatorio"]);
export const tipoCuenta = pgEnum("tipo_cuenta", ["caja_ahorro", "cuenta_corriente", "billetera"]);
export const modalidadHonorarios = pgEnum("modalidad_honorarios", ["porcentaje", "monto_fijo"]);
export const tipoBien = pgEnum("tipo_bien", ["inmueble", "terreno", "vehiculo", "otros"]);
export const estadoBien = pgEnum("estado_bien", [
  "disponible",
  "alquilado",
  "en_refaccion",
  "vendido",
  "activo",
  "de_baja",
]);
export const modoLiquidacion = pgEnum("modo_liquidacion", ["por_separado", "al_representante", "a_propietario"]);
export const modoHonorarios = pgEnum("modo_honorarios", [
  "sobre_parte_de_cada_titular",
  "sobre_total_al_representante",
]);
export const categoriaConcepto = pgEnum("categoria_concepto", [
  "servicio",
  "impuesto",
  "tasa",
  "expensa",
  "seguro",
  "otro",
]);
export const periodicidad = pgEnum("periodicidad", [
  "mensual",
  "bimestral",
  "trimestral",
  "cuatrimestral",
  "semestral",
  "anual",
]);
export const modalidadReparto = pgEnum("modalidad_reparto", [
  "segun_porcentaje",
  "un_solo_propietario",
  "personalizado",
]);

// Columnas que llevan todas las tablas (sección 5.1 de la especificación).
// `organizacion_id` se agrega en cada tabla, porque apunta a `organizacion`.
export const columnasBase = () => ({
  id: uuid("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  version: integer("version").notNull().default(1),
});

// Importe en centavos, como entero (nunca decimal).
export const centavos = (nombre: string) => bigint(nombre, { mode: "number" });
