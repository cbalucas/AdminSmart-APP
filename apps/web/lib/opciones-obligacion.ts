import { t } from "@ai/i18n";
import type { BienOpcion, ServicioOpcion } from "@/components/FormularioObligacion";
import { listarBienes, titularesDe } from "@/lib/bienes";
import { listarConceptos } from "@/lib/servicios";
import { crearClienteServidor } from "@/lib/supabase/servidor";

// Datos para los desplegables del formulario de obligación: bienes en uso, sus servicios activos y los conceptos activos.
export async function opcionesObligacion() {
  const [bienes, conceptos] = await Promise.all([listarBienes(), listarConceptos()]);
  const titulares = await titularesDe(bienes.filter((b) => b.esGastosVarios).map((b) => b.id));
  const supabase = await crearClienteServidor();
  const { data: servicios } = await supabase.from("bien_servicio").select("*").eq("estado", "activo").is("deleted_at", null);
  const concepto = new Map(conceptos.map((c) => [c.id, c.nombre]));

  const opcionesBien: BienOpcion[] = bienes
    .filter((b) => b.estado !== "vendido" && b.estado !== "de_baja")
    .map((b) => ({
      id: b.id,
      nombre: b.esGastosVarios ? `${t("bienes.gastos_varios")} · ${titulares.get(b.id)?.[0]?.nombre ?? ""}` : b.alias,
      alquilado: b.estado === "alquilado",
    }));
  const opcionesServicio: ServicioOpcion[] = (servicios ?? []).map((s) => ({
    id: s.id as string,
    bienId: s.bien_id as string,
    conceptoId: s.concepto_id as string,
    etiqueta: `${concepto.get(s.concepto_id as string) ?? "—"} · ${s.empresa_prestadora as string}`,
    responsableDefault: s.responsable_default as "propietario" | "inquilino",
    periodicidad: (s.periodicidad as string | null) ?? null,
    montoEstimado: s.monto_estimado === null || s.monto_estimado === undefined ? null : Number(s.monto_estimado),
    monedaEstimada: (s.monto_estimado_moneda as "ARS" | "USD" | null) ?? null,
  }));
  return {
    bienes: opcionesBien.sort((a, b) => a.nombre.localeCompare(b.nombre)),
    servicios: opcionesServicio,
    conceptos: conceptos.filter((c) => c.estado === "activo"),
    conceptosTodos: conceptos,
  };
}
