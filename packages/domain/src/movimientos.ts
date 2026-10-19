// Movimientos manuales de la cuenta corriente y traspasos entre monedas (diccionario 13).
// Los mensajes de error son claves de `packages/i18n/src/es-AR.json`.
import { z } from "zod";
import { aCentavos, type Moneda } from "./dinero";

/** MOV-03: tipos que carga el administrador a mano. El traspaso tiene su propio formulario (MOV-04). */
export const TIPOS_MOVIMIENTO_MANUAL = ["deposito_propietario", "transferencia_propietario", "gasto_extraordinario", "ajuste_manual"] as const;
export type TipoMovimientoManual = (typeof TIPOS_MOVIMIENTO_MANUAL)[number];
export type LadoMovimiento = "debe" | "haber";

const requerido = z.string({ error: "validacion.dato_obligatorio" }).trim().min(1, { error: "validacion.dato_obligatorio" });

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

const fecha = z
  .string({ error: "validacion.dato_obligatorio" })
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "validacion.fecha_invalida" });

/** Lado del libro: depósito suma (haber); transferencia y gasto extraordinario restan (debe); el ajuste elige. */
export function ladoDelMovimiento(tipo: TipoMovimientoManual, ajuste?: LadoMovimiento): LadoMovimiento {
  if (tipo === "deposito_propietario") return "haber";
  if (tipo === "ajuste_manual") return ajuste ?? "debe";
  return "debe";
}

/** MOV-03: los movimientos manuales exigen bien y descripción. */
export const esquemaMovimientoManual = z
  .object({
    propietarioId: requerido,
    bienId: requerido,
    tipo: z.enum(TIPOS_MOVIMIENTO_MANUAL, { error: "validacion.dato_obligatorio" }),
    ajuste: z.enum(["debe", "haber"]).default("debe"),
    moneda: z.enum(["ARS", "USD"], { error: "validacion.dato_obligatorio" }),
    fecha,
    importe,
    descripcion: requerido,
    confirmarExceso: z.boolean().default(false),
  })
  .transform((d) => ({ ...d, lado: ladoDelMovimiento(d.tipo, d.ajuste) }));
export type DatosMovimientoManual = z.output<typeof esquemaMovimientoManual>;

/** Número es-AR con coma decimal y hasta 6 decimales: "1.250,5" → 1250.5. Null si no es válido o no es positivo. */
export function parsearCotizacion(texto: string): number | null {
  const limpio = texto.trim().replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,6})?$/.test(limpio)) return null;
  const n = Number(limpio);
  return n > 0 ? n : null;
}

export interface DatosDeCambio {
  /** Pesos por dólar. */
  cotizacion: number | null;
  /** Centavos de peso. */
  pesos: number | null;
  /** Centavos de dólar. */
  dolares: number | null;
}

/**
 * MOV-04: de los tres datos del traspaso (cotización, monto en pesos y monto en dólares) alcanza con dos:
 * el tercero se calcula. Si vienen los tres, mandan los dos montos y la cotización escrita se conserva
 * solo si es coherente con ellos (dentro del redondeo del centavo de dólar).
 */
export function completarTraspaso(d: DatosDeCambio): { cotizacion: number; pesos: number; dolares: number } | null {
  const { cotizacion, pesos, dolares } = d;
  if (pesos !== null && dolares !== null) {
    // Los dólares se redondean al centavo: eso mueve los pesos hasta medio centavo de dólar por cotización.
    const coherente = cotizacion !== null && Math.abs(pesos - Math.round(dolares * cotizacion)) <= Math.ceil(cotizacion / 2) + 1;
    return { cotizacion: coherente ? (cotizacion as number) : Math.round((pesos / dolares) * 1_000_000) / 1_000_000, pesos, dolares };
  }
  if (cotizacion !== null && dolares !== null) return { cotizacion, dolares, pesos: Math.round(dolares * cotizacion) };
  if (cotizacion !== null && pesos !== null) return { cotizacion, pesos, dolares: Math.round(pesos / cotizacion) };
  return null;
}

const montoOpcional = z.string().trim().optional();

/** MOV-04: un traspaso se carga con dos de tres datos (cotización, monto en pesos, monto en dólares); el otro se calcula. */
export const esquemaTraspaso = z
  .object({
    propietarioId: requerido,
    bienId: requerido,
    monedaOrigen: z.enum(["ARS", "USD"], { error: "validacion.dato_obligatorio" }),
    cotizacion: montoOpcional,
    montoPesos: montoOpcional,
    montoDolares: montoOpcional,
    fecha,
    descripcion: z.string().trim().optional().transform((v) => (v ? v : null)),
    confirmarExceso: z.boolean().default(false),
  })
  .transform((d, ctx) => {
    const leidos = {
      cotizacion: d.cotizacion ? parsearCotizacion(d.cotizacion) : null,
      pesos: d.montoPesos ? aCentavos(d.montoPesos) : null,
      dolares: d.montoDolares ? aCentavos(d.montoDolares) : null,
    };
    let hayError = false;
    const marcar = (campo: string, escrito: string | undefined, valor: number | null) => {
      if (escrito && (valor === null || valor <= 0)) {
        ctx.addIssue({ code: "custom", path: [campo], message: "validacion.importe_invalido" });
        hayError = true;
      }
    };
    marcar("cotizacion", d.cotizacion, leidos.cotizacion);
    marcar("montoPesos", d.montoPesos, leidos.pesos);
    marcar("montoDolares", d.montoDolares, leidos.dolares);
    if (hayError) return z.NEVER;

    const r = completarTraspaso(leidos);
    if (!r || r.pesos <= 0 || r.dolares <= 0) {
      ctx.addIssue({ code: "custom", path: ["montoPesos"], message: "validacion.traspaso_dos_datos" });
      return z.NEVER;
    }
    const monedaDestino: Moneda = d.monedaOrigen === "ARS" ? "USD" : "ARS";
    return {
      propietarioId: d.propietarioId,
      bienId: d.bienId,
      fecha: d.fecha,
      descripcion: d.descripcion,
      confirmarExceso: d.confirmarExceso,
      monedaOrigen: d.monedaOrigen as Moneda,
      monedaDestino,
      importeOrigen: d.monedaOrigen === "ARS" ? r.pesos : r.dolares,
      importeDestino: d.monedaOrigen === "ARS" ? r.dolares : r.pesos,
      tipoCambio: r.cotizacion,
    };
  });
export type DatosTraspaso = z.output<typeof esquemaTraspaso>;

/** MOV-04: tipo de cambio aplicado, en pesos por dólar, con 6 decimales. */
export function tipoDeCambioDelTraspaso(origen: { moneda: Moneda; centavos: number }, destino: { moneda: Moneda; centavos: number }): number {
  const pesos = origen.moneda === "ARS" ? origen.centavos : destino.centavos;
  const dolares = origen.moneda === "ARS" ? destino.centavos : origen.centavos;
  return Math.round((pesos / dolares) * 1_000_000) / 1_000_000;
}

export interface MovimientoDeLibro {
  id: string;
  debe: number;
  haber: number;
}

/** MOV-01: saldo acumulado después de cada movimiento (haber − debe), a partir de un saldo inicial. */
export function conSaldoAcumulado<T extends MovimientoDeLibro>(movimientos: readonly T[], saldoInicial = 0): (T & { saldo: number })[] {
  let saldo = saldoInicial;
  return movimientos.map((m) => {
    saldo += m.haber - m.debe;
    return { ...m, saldo };
  });
}

/** MOV-02, MOV-03: solo se anulan los movimientos manuales que no son contramovimientos ni están ya anulados. */
export function sePuedeAnularMovimiento(m: { origenTipo: string; esContramovimiento: boolean; yaAnulado: boolean }): boolean {
  return m.origenTipo === "manual" && !m.esContramovimiento && !m.yaAnulado;
}
