import { t } from "@ai/i18n";
import { formatearPeriodo, normalizarNombre } from "@ai/domain";
import type { Bien, Titular } from "@/lib/bienes";
import type { FilaObligacion } from "@/lib/obligaciones";

export interface FiltrosObligaciones {
  estado?: string;
  propietario?: string;
  tipo?: string;
  responsable?: string;
  periodo?: string;
  q?: string;
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
  const buscado = normalizarNombre(f.q ?? "");
  const coincide = (o: FilaObligacion) => {
    if (!buscado) return true;
    const bien = bienDe.get(o.bienId);
    const fecha = o.vencimiento ? o.vencimiento.split("-").reverse().join("/") : "";
    const monto = o.monto === null ? "" : `${o.monto / 100} ${(o.monto / 100).toLocaleString("es-AR")}`;
    const texto = [
      bien ? (bien.esGastosVarios ? t("bienes.gastos_varios") : bien.alias) : "",
      bien ? t(`tipo_bien.${bien.tipoBien}`) : "",
      (titulares.get(o.bienId) ?? []).map((x) => x.nombre).join(" "),
      o.concepto,
      o.empresa ?? "",
      o.descripcion ?? "",
      t(`obligaciones.responsable_${o.responsable}`),
      formatearPeriodo(o.periodo),
      `${o.periodo.slice(5, 7)}/${o.periodo.slice(0, 4)}`,
      fecha,
      monto,
    ].join(" ");
    return normalizarNombre(texto).includes(buscado);
  };
  const sinEstado = todas
    .filter(coincide)
    .filter((o) => !f.propietario || (titulares.get(o.bienId) ?? []).some((x) => x.propietarioId === f.propietario))
    .filter((o) => !f.tipo || bienDe.get(o.bienId)?.tipoBien === f.tipo)
    .filter((o) => !f.responsable || o.responsable === f.responsable)
    .filter((o) => !f.periodo || o.periodo === f.periodo);
  const lista = sinEstado
    .filter((o) => !f.estado || o.estado === f.estado)
    .sort((a, b) => a.periodo.localeCompare(b.periodo) || (a.vencimiento ?? "9999").localeCompare(b.vencimiento ?? "9999"));
  return { sinEstado, lista };
}
