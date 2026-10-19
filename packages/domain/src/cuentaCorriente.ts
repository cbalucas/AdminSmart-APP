import type { Moneda } from "./dinero";

export interface MovimientoSaldo {
  moneda: Moneda;
  debe: number;
  haber: number;
}

/** MOV-01: el saldo no se guarda; es haber − debe de todos los movimientos (las anulaciones son contramovimientos). */
export function calcularSaldo(movimientos: readonly MovimientoSaldo[], moneda: Moneda): number {
  let saldo = 0;
  for (const m of movimientos) {
    if (m.moneda === moneda) saldo += m.haber - m.debe;
  }
  return saldo;
}

export interface ContramovimientoDe {
  propietarioId: string;
  bienId: string;
  moneda: Moneda;
  debe: number;
  haber: number;
}

/** RN-05 / MOV-02: la anulación invierte exactamente el original (debe y haber cruzados). */
export function contramovimiento(original: ContramovimientoDe): ContramovimientoDe {
  return { ...original, debe: original.haber, haber: original.debe };
}

/** MOV-05: una transferencia no puede superar el saldo disponible salvo confirmación expresa. */
export function transferenciaExcedeSaldo(saldoCentavos: number, transferenciaCentavos: number): boolean {
  return transferenciaCentavos > Math.max(0, saldoCentavos);
}

export interface Deposito {
  fecha: string; // AAAA-MM-DD
  centavos: number;
  moneda: Moneda;
  esAjuste: boolean;
}

/**
 * RN-16 / PRO-11: promedio mensual de los depósitos de los últimos 12 meses, por moneda,
 * sin contar los ajustes. Divide por 12 (el período completo), no por los meses con depósito.
 * `hoy` es AAAA-MM-DD; la ventana va desde el mismo día un año antes (exclusive) hasta hoy.
 */
export function calcularPagoPromedio(depositos: readonly Deposito[], moneda: Moneda, hoy: string): number {
  const [a, m, d] = hoy.split("-").map(Number);
  const desde = `${String(a - 1).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  let total = 0;
  for (const dep of depositos) {
    if (dep.moneda !== moneda || dep.esAjuste) continue;
    if (dep.fecha > desde && dep.fecha <= hoy) total += dep.centavos;
  }
  return Math.round(total / 12);
}
