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

/** MOV-04: un traspaso lleva el importe que sale en una moneda y el que entra en la otra. */
export const esquemaTraspaso = z
  .object({
    propietarioId: requerido,
    bienId: requerido,
    monedaOrigen: z.enum(["ARS", "USD"], { error: "validacion.dato_obligatorio" }),
    importeOrigen: importe,
    importeDestino: importe,
    fecha,
    descripcion: z.string().trim().optional().transform((v) => (v ? v : null)),
    confirmarExceso: z.boolean().default(false),
  })
  .transform((d) => ({ ...d, monedaDestino: (d.monedaOrigen === "ARS" ? "USD" : "ARS") as Moneda }));
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
