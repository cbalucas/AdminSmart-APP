// Importes en centavos (entero) con su moneda. Nunca se usa decimal para dinero (RN-06).
export type Moneda = "ARS" | "USD";

export const MONEDAS: readonly Moneda[] = ["ARS", "USD"];

export interface Importe {
  centavos: number;
  moneda: Moneda;
}

function exigirEntero(centavos: number): void {
  if (!Number.isSafeInteger(centavos)) {
    throw new Error("RN-06: el importe debe ser un entero en centavos");
  }
}

/** RN-14: nunca se suman importes de monedas distintas. */
export function sumarImportes(importes: readonly Importe[], moneda: Moneda): number {
  let total = 0;
  for (const i of importes) {
    exigirEntero(i.centavos);
    if (i.moneda !== moneda) {
      throw new Error("RN-14: no se pueden compensar pesos con dólares");
    }
    total += i.centavos;
  }
  return total;
}

/** Convierte un texto con coma decimal (es-AR) a centavos: "41.300,50" → 4130050. */
export function aCentavos(texto: string): number | null {
  const limpio = texto.trim().replace(/\./g, "").replace(",", ".");
  if (!/^-?\d+(\.\d{1,2})?$/.test(limpio)) return null;
  const negativo = limpio.startsWith("-");
  const [enteros, decimales = ""] = limpio.replace("-", "").split(".");
  const centavos = Number(enteros) * 100 + Number(decimales.padEnd(2, "0"));
  return negativo ? -centavos : centavos;
}

/** Formato es-AR: $ 41.300 · $ 41.300,50 · US$ 1.250. Los centavos solo se muestran si existen. */
export function formatearImporte(centavos: number, moneda: Moneda): string {
  exigirEntero(centavos);
  const negativo = centavos < 0;
  const absoluto = Math.abs(centavos);
  const enteros = Math.floor(absoluto / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const resto = absoluto % 100;
  const decimales = resto === 0 ? "" : `,${resto.toString().padStart(2, "0")}`;
  const simbolo = moneda === "USD" ? "US$" : "$";
  return `${negativo ? "-" : ""}${simbolo} ${enteros}${decimales}`;
}

/** Fecha ISO (AAAA-MM-DD) a es-AR: 14/10/2026. */
export function formatearFecha(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) throw new Error("Fecha inválida");
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/**
 * Reparte un importe entre titulares según sus porcentajes (condominio, sección 4.4).
 * Usa aritmética entera: la suma de las partes es siempre igual al total, y los
 * centavos sobrantes van a quienes tienen mayor resto (empate: el primero).
 * Los porcentajes deben sumar exactamente 100 (hasta 4 decimales).
 */
export function repartirPorPorcentaje(totalCentavos: number, porcentajes: readonly number[]): number[] {
  exigirEntero(totalCentavos);
  if (porcentajes.length === 0) throw new Error("CON-01: falta al menos un titular");
  const pesos = porcentajes.map((p) => BigInt(Math.round(p * 10000)));
  const sumaPesos = pesos.reduce((a, b) => a + b, 0n);
  if (sumaPesos !== 1_000_000n) throw new Error("CON-01: los porcentajes deben sumar 100 %");

  const total = BigInt(Math.abs(totalCentavos));
  const partes = pesos.map((w) => (total * w) / 1_000_000n);
  const restos = pesos.map((w, i) => ({ i, resto: (total * w) % 1_000_000n }));
  let faltante = total - partes.reduce((a, b) => a + b, 0n);
  restos.sort((a, b) => (a.resto === b.resto ? a.i - b.i : a.resto > b.resto ? -1 : 1));
  for (const r of restos) {
    if (faltante === 0n) break;
    partes[r.i] += 1n;
    faltante -= 1n;
  }
  const signo = totalCentavos < 0 ? -1 : 1;
  return partes.map((p) => signo * Number(p));
}
