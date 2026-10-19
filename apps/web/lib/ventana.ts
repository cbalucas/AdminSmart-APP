import { cache } from "react";
import { enVentanaDeFinDeMes, pendientesDeLaVentana, periodoDelMesSiguiente } from "@ai/domain";
import { t } from "@ai/i18n";
import { listarBienes, titularesDe } from "@/lib/bienes";
import { fechaHoy, listarObligaciones, type FilaObligacion } from "@/lib/obligaciones";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export interface ItemVentana {
  id: string;
  propietario: string;
  bien: string;
  tipoBien: string;
  concepto: string;
  periodo: string;
  moneda: "ARS" | "USD";
  /** Último monto cargado del mismo gasto, como referencia. */
  anterior: number | null;
}

// Para no consultar la configuración en cada pantalla, solo se mira en la segunda mitad del mes.
const DIAS_MAXIMOS_AVISO = 15;

// P-48, OBL-08: ¿hay que mostrar la ventana de fin de mes hoy? Los días de aviso son configurables (por defecto 5).
export const configVentana = cache(async (): Promise<{ enVentana: boolean }> => {
  const hoy = fechaHoy();
  if (!enVentanaDeFinDeMes(hoy, DIAS_MAXIMOS_AVISO)) return { enVentana: false };
  const supabase = await crearClienteServidor();
  const { data } = await supabase.from("organizacion").select("dias_aviso_recurrentes").limit(1).maybeSingle();
  const dias = Number(data?.dias_aviso_recurrentes ?? 5);
  return { enVentana: enVentanaDeFinDeMes(hoy, dias) };
});

const claveDe = (o: FilaObligacion) => (o.bienServicioId ? `s:${o.bienServicioId}` : `g:${o.bienId}|${o.conceptoId}|${(o.descripcion ?? "").trim().toLowerCase()}`);

// Gastos que la ventana pide completar, con el último monto de cada uno como referencia.
export const itemsDeVentana = cache(async (): Promise<{ items: ItemVentana[]; mes: string }> => {
  const hoy = fechaHoy();
  const [todas, bienes] = await Promise.all([listarObligaciones(), listarBienes()]);
  const pendientes = pendientesDeLaVentana(todas, hoy);
  const titulares = await titularesDe([...new Set(pendientes.map((o) => o.bienId))]);
  const bienDe = new Map(bienes.map((b) => [b.id, b]));

  const items = pendientes
    .map((o): ItemVentana => {
      const previa = todas
        .filter((x) => claveDe(x) === claveDe(o) && x.periodo < o.periodo && x.monto !== null && x.estado !== "anulada")
        .sort((a, b) => b.periodo.localeCompare(a.periodo))[0];
      const bien = bienDe.get(o.bienId);
      const propietario = titulares.get(o.bienId)?.[0]?.nombre ?? "—";
      return {
        id: o.id,
        propietario,
        bien: bien ? (bien.esGastosVarios ? t("bienes.gastos_varios") : bien.alias) : "—",
        tipoBien: bien?.tipoBien ?? "otros",
        concepto: o.descripcion ? `${o.concepto} · ${o.descripcion}` : o.concepto,
        periodo: o.periodo,
        moneda: o.moneda,
        anterior: previa?.moneda === o.moneda ? (previa?.monto ?? null) : null,
      };
    })
    .sort((a, b) => a.propietario.localeCompare(b.propietario) || a.bien.localeCompare(b.bien) || a.concepto.localeCompare(b.concepto));

  const mes = new Date(`${periodoDelMesSiguiente(hoy)}T00:00:00Z`).toLocaleDateString("es-AR", { month: "long", year: "numeric", timeZone: "UTC" });
  return { items, mes };
});
