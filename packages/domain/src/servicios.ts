// Catálogo de conceptos (diccionario 4.1) y servicios o impuestos de cada bien (diccionario 4).
// Los mensajes de error son claves de `packages/i18n/src/es-AR.json`.
import { z } from "zod";
import { aCentavos } from "./dinero";

export const CATEGORIAS_CONCEPTO = ["servicio", "impuesto", "tasa", "expensa", "seguro", "otro"] as const;
export type CategoriaConcepto = (typeof CATEGORIAS_CONCEPTO)[number];

export const PERIODICIDADES_SERVICIO = ["mensual", "bimestral", "trimestral", "cuatrimestral", "semestral", "anual"] as const;
export type PeriodicidadServicio = (typeof PERIODICIDADES_SERVICIO)[number];

const texto = z.string().trim();
// Obligatorio: tanto vacío como ausente dan el mismo mensaje.
const obligatorio = z.string({ error: "validacion.dato_obligatorio" }).trim().min(1, { error: "validacion.dato_obligatorio" });
const textoOpcional = texto.optional().transform((v) => (v ? v : null));

export const esquemaConcepto = z.object({
  nombre: texto.min(1, { error: "validacion.nombre_obligatorio" }),
  categoria: z.enum(CATEGORIAS_CONCEPTO, { error: "validacion.dato_obligatorio" }),
});
export type DatosConcepto = z.output<typeof esquemaConcepto>;

/** Dos conceptos son "el mismo" si coinciden sin distinguir mayúsculas ni espacios de más. */
export const mismoConcepto = (a: string, b: string) => a.trim().replace(/\s+/g, " ").toLowerCase() === b.trim().replace(/\s+/g, " ").toLowerCase();

/**
 * Sitio de boletas: una dirección web http o https. Nunca se guardan contraseñas: se rechaza
 * una dirección que lleve usuario y clave incrustados (https://usuario:clave@sitio.com).
 */
export function esSitioBoletasValido(valor: string): boolean {
  try {
    const url = new URL(valor);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    return url.username === "" && url.password === "";
  } catch {
    return false;
  }
}

const sitioBoletas = texto
  .optional()
  .transform((v) => (v ? (/^https?:\/\//i.test(v) ? v : `https://${v}`) : null))
  .refine((v) => v === null || esSitioBoletasValido(v), { error: "validacion.sitio_invalido" });

const importeEstimado = texto
  .optional()
  .transform((v, ctx) => {
    if (!v) return null;
    const centavos = aCentavos(v);
    if (centavos === null || centavos <= 0) {
      ctx.addIssue({ code: "custom", message: "validacion.importe_invalido" });
      return z.NEVER;
    }
    return centavos;
  });

export const esquemaServicio = z.object({
  conceptoId: obligatorio,
  nroCuentaCliente: obligatorio,
  empresaPrestadora: obligatorio,
  responsableDefault: z.enum(["propietario", "inquilino"], { error: "validacion.dato_obligatorio" }),
  estado: z.enum(["activo", "inactivo"]).default("activo"),
  titularServicio: textoOpcional,
  periodicidad: z
    .enum(PERIODICIDADES_SERVICIO)
    .nullable()
    .default(null),
  diaVencimiento: z.number().int().min(1, { error: "validacion.dia_invalido" }).max(31, { error: "validacion.dia_invalido" }).nullable().default(null),
  montoEstimado: importeEstimado,
  montoEstimadoMoneda: z.enum(["ARS", "USD"]).default("ARS"),
  debitoAutomatico: z.boolean().default(false),
  sitioBoletas,
  observaciones: textoOpcional,
});
export type DatosServicio = z.output<typeof esquemaServicio>;

/** El monto estimado y su moneda van juntos o no van (bien_servicio_monto_ck). */
export const monedaDelMonto = (d: Pick<DatosServicio, "montoEstimado" | "montoEstimadoMoneda">) =>
  d.montoEstimado === null ? null : d.montoEstimadoMoneda;
