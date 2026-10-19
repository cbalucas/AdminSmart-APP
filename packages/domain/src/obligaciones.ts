import { z } from "zod";
import { aCentavos, type Moneda } from "./dinero";

export type EstadoObligacion = "a_completar" | "pendiente" | "vencida" | "pagada" | "anulada";
export type Responsable = "propietario" | "inquilino";
export type Frecuencia = "mensual" | "bimestral" | "trimestral" | "cuatrimestral" | "semestral" | "anual";

export interface ObligacionBase {
  monto: number | null;
  vencimiento: string | null; // AAAA-MM-DD
  pagada: boolean; // tiene un pago vigente (no anulado ni en conflicto)
  anulada: boolean;
}

/** Misma lógica que la vista obligacion_estado: RN-04, RN-05, OBL-02, OBL-11. `hoy` es AAAA-MM-DD. */
export function estadoObligacion(o: ObligacionBase, hoy: string): EstadoObligacion {
  if (o.anulada) return "anulada";
  if (o.pagada) return "pagada";
  if (o.monto === null) return "a_completar";
  if (o.vencimiento !== null && o.vencimiento < hoy) return "vencida";
  return "pendiente";
}

/** RN-01: sin contrato vigente el responsable es siempre el propietario; si no, lo dice la matriz. */
export function resolverResponsable(
  bienAlquilado: boolean,
  matriz: Responsable | undefined,
): Responsable {
  if (!bienAlquilado || matriz === undefined) return "propietario";
  return matriz;
}

const MESES_POR_FRECUENCIA: Record<Frecuencia, number> = {
  mensual: 1,
  bimestral: 2,
  trimestral: 3,
  cuatrimestral: 4,
  semestral: 6,
  anual: 12,
};

/** OBL-05: período de la próxima ocurrencia. El período es el primer día del mes (AAAA-MM-01). */
export function proximoPeriodo(periodo: string, frecuencia: Frecuencia): string {
  const [a, m] = periodo.split("-").map(Number);
  const indice = a * 12 + (m - 1) + MESES_POR_FRECUENCIA[frecuencia];
  const anio = Math.floor(indice / 12);
  const mes = (indice % 12) + 1;
  return `${String(anio).padStart(4, "0")}-${String(mes).padStart(2, "0")}-01`;
}

export interface ObligacionPendiente extends ObligacionBase {
  id: string;
  moneda: Moneda;
  responsable: Responsable;
}

export interface MontoADepositar {
  moneda: Moneda;
  /** Obligaciones sumadas (pendientes y vencidas del propietario con vencimiento ≤ fecha límite). */
  sumaObligaciones: number;
  saldoDisponible: number;
  reposicionFondoReserva: number;
  aDepositar: number;
  /** Si el saldo cubre todo, lo que sobra se puede transferir al propietario. */
  saldoATransferir: number;
  /** OBL-11: sin monto, no suman. */
  aConfirmar: string[];
  /** OBL-07: con monto pero sin vencimiento, no suman. */
  posiblesObligaciones: string[];
}

/**
 * RN-02, RN-14, RN-15, sección 4.5: monto a depositar en una moneda.
 * A depositar = max(0, obligaciones − saldo) (+ reposición del fondo de reserva, PRO-09).
 * Un saldo deudor (MOV-07) aumenta lo que hay que depositar.
 */
export function calcularMontoADepositar(args: {
  obligaciones: readonly ObligacionPendiente[];
  moneda: Moneda;
  saldoDisponible: number;
  fechaLimite: string;
  hoy: string;
  reposicionFondoReserva?: number;
}): MontoADepositar {
  const { obligaciones, moneda, saldoDisponible, fechaLimite, hoy } = args;
  const reposicion = args.reposicionFondoReserva ?? 0;
  let suma = 0;
  const aConfirmar: string[] = [];
  const posibles: string[] = [];

  for (const o of obligaciones) {
    if (o.moneda !== moneda || o.responsable !== "propietario") continue;
    const estado = estadoObligacion(o, hoy);
    if (estado === "pagada" || estado === "anulada") continue;
    if (estado === "a_completar") {
      aConfirmar.push(o.id);
      continue;
    }
    if (o.vencimiento === null) {
      posibles.push(o.id);
      continue;
    }
    if (o.vencimiento <= fechaLimite) suma += o.monto as number;
  }

  const necesidad = suma - saldoDisponible;
  const aDepositar = Math.max(0, necesidad) + (reposicion > 0 ? reposicion : 0);
  return {
    moneda,
    sumaObligaciones: suma,
    saldoDisponible,
    reposicionFondoReserva: reposicion,
    aDepositar,
    saldoATransferir: Math.max(0, -necesidad),
    aConfirmar,
    posiblesObligaciones: posibles,
  };
}

export interface PagoARegistrar {
  montoObligacion: number | null;
  importe: number;
  monedaObligacion: Moneda;
  monedaPago: Moneda;
}

export type ResultadoValidacionPago =
  | { ok: true; requiereConfirmacion: boolean; diferencia: number }
  | { ok: false; error: "PAG-03" };

/** PAG-01, PAG-03: misma moneda; si el importe difiere del monto se pide confirmación y motivo. */
export function validarPago(p: PagoARegistrar): ResultadoValidacionPago {
  if (p.monedaPago !== p.monedaObligacion) return { ok: false, error: "PAG-03" };
  if (p.montoObligacion === null) return { ok: true, requiereConfirmacion: false, diferencia: 0 };
  const diferencia = p.importe - p.montoObligacion;
  return { ok: true, requiereConfirmacion: diferencia !== 0, diferencia };
}

export type PagadoPor = "administracion" | "propietario_directo" | "inquilino";
export type ImpactoPago = "debito_propietario" | "deuda_inquilino" | "solo_historial";

/** PAG-04, RN-03, RN-13: impacto contable de un pago según quién pagó y a cargo de quién está. */
export function impactoDelPago(pagadoPor: PagadoPor, responsable: Responsable): ImpactoPago {
  if (pagadoPor !== "administracion") return "solo_historial";
  return responsable === "propietario" ? "debito_propietario" : "deuda_inquilino";
}

/** Período (AAAA-MM-01) al que pertenece una fecha AAAA-MM-DD. */
export function periodoDeFecha(fecha: string): string {
  return `${fecha.slice(0, 7)}-01`;
}

const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** "2026-10-01" → "oct 2026". */
export function formatearPeriodo(periodo: string): string {
  const [a, m] = periodo.split("-").map(Number);
  return `${MESES_CORTOS[m - 1]} ${a}`;
}

/** OBL-06: una obligación pagada o anulada no se modifica; primero hay que anular su pago. */
export function puedeModificarObligacion(o: { pagada: boolean; anulada: boolean }): boolean {
  return !o.pagada && !o.anulada;
}

/**
 * OBL-05, OBL-09: período de la ocurrencia que hay que generar a partir de una obligación, o null.
 * Se genera cuando la obligación es recurrente, su período ya comenzó y todavía no existe la siguiente;
 * así cada gasto recurrente conserva una sola ocurrencia futura.
 */
export function siguienteAGenerar(
  o: { periodo: string; esRecurrente: boolean; frecuencia: Frecuencia | null; anulada: boolean },
  periodosExistentes: readonly string[],
  hoy: string,
): string | null {
  if (!o.esRecurrente || o.frecuencia === null || o.anulada) return null;
  if (o.periodo > periodoDeFecha(hoy)) return null;
  const siguiente = proximoPeriodo(o.periodo, o.frecuencia);
  return periodosExistentes.includes(siguiente) ? null : siguiente;
}

const FRECUENCIAS = ["mensual", "bimestral", "trimestral", "cuatrimestral", "semestral", "anual"] as const;
const requerido = z.string({ error: "validacion.dato_obligatorio" }).trim().min(1, { error: "validacion.dato_obligatorio" });
const opcional = z.string().trim().optional().transform((v) => (v ? v : null));

/** Alta y edición de una obligación (P-27). El período llega como AAAA-MM y se guarda como AAAA-MM-01. */
export const esquemaObligacion = z
  .object({
    bienId: requerido,
    bienServicioId: opcional,
    conceptoId: requerido,
    periodo: z
      .string({ error: "validacion.dato_obligatorio" })
      .trim()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/, { error: "validacion.periodo_invalido" })
      .transform((v) => `${v}-01`),
    esRecurrente: z.boolean().default(false),
    frecuencia: z.enum(FRECUENCIAS).nullable().default(null),
    monto: z
      .string()
      .trim()
      .optional()
      .transform((v, ctx) => {
        if (!v) return null;
        const centavos = aCentavos(v);
        if (centavos === null || centavos <= 0) {
          ctx.addIssue({ code: "custom", message: "validacion.importe_invalido" });
          return z.NEVER;
        }
        return centavos;
      }),
    moneda: z.enum(["ARS", "USD"]).default("ARS"),
    responsable: z.enum(["propietario", "inquilino"], { error: "validacion.dato_obligatorio" }),
    vencimiento: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v ? v : null))
      .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), { error: "validacion.fecha_invalida" }),
    descripcion: opcional,
    codigoPago: opcional,
    observaciones: opcional,
  })
  .superRefine((d, ctx) => {
    // OBL-04: un gasto suelto (sin servicio) lleva descripción.
    if (d.bienServicioId === null && d.descripcion === null) {
      ctx.addIssue({ code: "custom", path: ["descripcion"], message: "validacion.descripcion_obligatoria" });
    }
    // Una obligación recurrente indica con qué frecuencia.
    if (d.esRecurrente && d.frecuencia === null) {
      ctx.addIssue({ code: "custom", path: ["frecuencia"], message: "validacion.dato_obligatorio" });
    }
  });
export type DatosObligacion = z.output<typeof esquemaObligacion>;
