import type { Bien, Titular } from "@/lib/bienes";
import type { FilaObligacion } from "@/lib/obligaciones";

export interface FiltrosObligaciones {
  estado?: string;
  propietario?: string;
  tipo?: string;
  responsable?: string;
  periodo?: string;
}

/**
 * Filtros de la pantalla Obligaciones (P-26). `sinEstado` aplica todos menos el estado: sobre él se cuentan las
 * pestañas. `lista` suma el estado y queda ordenada por período y vencimiento. La exportación a Excel usa lo mismo.
 */
export function filtrarObligaciones(
  todas: readonly FilaObligacion[],
  f: FiltrosObligaciones,
  titulares: ReadonlyMap<string, readonly Titular[]>,
  bienDe: ReadonlyMap<string, Bien>,
): { sinEstado: FilaObligacion[]; lista: FilaObligacion[] } {
  const sinEstado = todas
    .filter((o) => !f.propietario || (titulares.get(o.bienId) ?? []).some((x) => x.propietarioId === f.propietario))
    .filter((o) => !f.tipo || bienDe.get(o.bienId)?.tipoBien === f.tipo)
    .filter((o) => !f.responsable || o.responsable === f.responsable)
    .filter((o) => !f.periodo || o.periodo === f.periodo);
  const lista = sinEstado
    .filter((o) => !f.estado || o.estado === f.estado)
    .sort((a, b) => a.periodo.localeCompare(b.periodo) || (a.vencimiento ?? "9999").localeCompare(b.vencimiento ?? "9999"));
  return { sinEstado, lista };
}
