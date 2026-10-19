// Pagos (diccionario 11): registro, impacto en la cuenta corriente y anulación.
// Los mensajes de error son claves de `packages/i18n/src/es-AR.json`.
import { z } from "zod";
import { aCentavos, repartirPorPorcentaje } from "./dinero";
import { impactoDelPago, type PagadoPor, type Responsable, type ResultadoValidacionPago } from "./obligaciones";

export const MEDIOS_PAGO = ["transferencia", "efectivo", "debito_automatico", "tarjeta", "pago_mis_cuentas", "otro"] as const;
export type MedioPago = (typeof MEDIOS_PAGO)[number];

const requerido = z.string({ error: "validacion.dato_obligatorio" }).trim().min(1, { error: "validacion.dato_obligatorio" });
const opcional = z.string().trim().optional().transform((v) => (v ? v : null));

const importe = z
  .string({ error: "validacion.dato_obligatorio" })
  .trim()
  .transform((v, ctx) => {
    const centavos = aCentavos(v);
    if (centavos === null || centavos <= 0) {
      ctx.addIssue({ code: "custom", message: v === "" ? "validacion.dato_obligatorio" : "validacion.importe_invalido" });
      return z.NEVER;
    }
    return centavos;
  });

const camposPago = {
  fecha: z
    .string({ error: "validacion.dato_obligatorio" })
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "validacion.fecha_invalida" }),
  importe,
  pagadoPor: z.enum(["administracion", "propietario_directo", "inquilino"], { error: "validacion.dato_obligatorio" }),
  medio: z.enum(MEDIOS_PAGO).nullable().default(null),
  nroOperacion: opcional,
  observaciones: opcional,
  motivoDiferencia: opcional,
  confirmarDiferencia: z.boolean().default(false),
};

/** Pago de una obligación existente (P-28). */
export const esquemaPago = z.object({ obligacionId: requerido, ...camposPago });
export type DatosPago = z.output<typeof esquemaPago>;

/** PAG-02: un pago sin obligación previa exige bien, concepto, responsable y descripción. */
export const esquemaPagoDirecto = z.object({
  bienId: requerido,
  conceptoId: requerido,
  responsable: z.enum(["propietario", "inquilino"], { error: "validacion.dato_obligatorio" }),
  descripcion: requerido,
  moneda: z.enum(["ARS", "USD"]).default("ARS"),
  ...camposPago,
});
export type DatosPagoDirecto = z.output<typeof esquemaPagoDirecto>;

/** PAG-05: la anulación exige motivo. */
export const esquemaAnulacion = z.object({ motivo: requerido });

/** PAG-01: si el importe difiere del monto hay que confirmar y explicar el motivo. */
export function exigirConfirmacionDeDiferencia(
  validacion: Extract<ResultadoValidacionPago, { ok: true }>,
  confirmacion: { confirmar: boolean; motivo: string | null },
): { ok: true } | { ok: false; error: "validacion.diferencia_sin_confirmar" | "validacion.motivo_diferencia" } {
  if (!validacion.requiereConfirmacion) return { ok: true };
  if (!confirmacion.confirmar) return { ok: false, error: "validacion.diferencia_sin_confirmar" };
  if (!confirmacion.motivo) return { ok: false, error: "validacion.motivo_diferencia" };
  return { ok: true };
}

export interface TitularDelBien {
  propietarioId: string;
  porcentaje: number;
}

export interface DebitoDelPago {
  propietarioId: string;
  debe: number;
}

/**
 * PAG-04, RN-13: débitos que genera un pago en la cuenta corriente. Solo si pagó la administración
 * una obligación a cargo del propietario; cada titular absorbe su porcentaje (CON-02) y la parte de
 * los cotitulares no cargados no se imputa a nadie.
 */
export function debitosDelPago(args: {
  pagadoPor: PagadoPor;
  responsable: Responsable;
  importe: number;
  titulares: readonly TitularDelBien[];
}): DebitoDelPago[] {
  if (impactoDelPago(args.pagadoPor, args.responsable) !== "debito_propietario") return [];
  if (args.titulares.length === 0) return [];
  const partes = repartirPorPorcentaje(args.importe, args.titulares.map((t) => t.porcentaje));
  return args.titulares.map((t, i) => ({ propietarioId: t.propietarioId, debe: partes[i] as number })).filter((d) => d.debe > 0);
}

/** MOV-07: ¿el débito deja la cuenta con saldo deudor? Se avisa antes de registrar el pago. */
export function dejaSaldoDeudor(saldoActual: number, debe: number): boolean {
  return saldoActual - debe < 0;
}

const aTexto = (centavos: number) => `${Math.floor(centavos / 100)},${String(centavos % 100).padStart(2, "0")}`;

/** Texto de la diferencia entre lo pagado y el monto, para guardarlo en las observaciones del pago (PAG-01). */
export function leyendaDeDiferencia(montoObligacion: number, importePagado: number, motivo: string): string {
  const dif = importePagado - montoObligacion;
  return `Diferencia ${dif > 0 ? "+" : "-"}${aTexto(Math.abs(dif))} respecto del monto (${aTexto(montoObligacion)}): ${motivo}`;
}
