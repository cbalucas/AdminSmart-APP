import { listarObligaciones } from "@/lib/obligaciones";

export interface ItemDetalle {
  concepto: string;
  vencimiento: string | null;
  monto: number | null;
  moneda: "ARS" | "USD";
}

export type SituacionBien = "con_deuda" | "a_completar" | "al_dia" | "sin_obligaciones";

export interface ResumenBien {
  situacion: SituacionBien;
  vencidas: ItemDetalle[];
  proximas: ItemDetalle[];
  aCompletar: ItemDetalle[];
  pagadas: number;
}

const porVencimiento = (a: ItemDetalle, b: ItemDetalle) => (a.vencimiento ?? "9999").localeCompare(b.vencimiento ?? "9999");

/** Situación de cada bien según sus obligaciones: con deuda (vencidas), montos por completar, al día o sin obligaciones. */
export async function resumenDeBienes(bienIds: string[]): Promise<Map<string, ResumenBien>> {
  const todas = await listarObligaciones();
  const ids = new Set(bienIds);
  const mapa = new Map<string, ResumenBien>();
  for (const id of ids) mapa.set(id, { situacion: "sin_obligaciones", vencidas: [], proximas: [], aCompletar: [], pagadas: 0 });
  for (const o of todas) {
    const r = mapa.get(o.bienId);
    if (!r) continue;
    const item: ItemDetalle = { concepto: o.concepto, vencimiento: o.vencimiento, monto: o.monto, moneda: o.moneda };
    if (o.estado === "vencida") r.vencidas.push(item);
    else if (o.estado === "pendiente") r.proximas.push(item);
    else if (o.estado === "a_completar") r.aCompletar.push(item);
    else if (o.estado === "pagada") r.pagadas++;
  }
  for (const r of mapa.values()) {
    r.vencidas.sort(porVencimiento);
    r.proximas.sort(porVencimiento);
    const hayAlgo = r.vencidas.length + r.proximas.length + r.aCompletar.length + r.pagadas > 0;
    r.situacion = r.vencidas.length > 0 ? "con_deuda" : r.aCompletar.length > 0 ? "a_completar" : hayAlgo ? "al_dia" : "sin_obligaciones";
  }
  return mapa;
}
