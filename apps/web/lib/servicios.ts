import { cache } from "react";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export interface Servicio {
  id: string;
  bienId: string;
  conceptoId: string;
  concepto: string;
  nroCuentaCliente: string;
  empresaPrestadora: string;
  responsableDefault: string;
  estado: string;
  titularServicio: string | null;
  periodicidad: string | null;
  diaVencimiento: number | null;
  montoEstimado: number | null;
  montoEstimadoMoneda: "ARS" | "USD" | null;
  debitoAutomatico: boolean;
  sitioBoletas: string | null;
  observaciones: string | null;
}

export interface ConceptoOpcion {
  id: string;
  nombre: string;
  estado: string;
}

const aServicio = (s: Record<string, unknown>, concepto: string): Servicio => ({
  id: s.id as string,
  bienId: s.bien_id as string,
  conceptoId: s.concepto_id as string,
  concepto,
  nroCuentaCliente: s.nro_cuenta_cliente as string,
  empresaPrestadora: s.empresa_prestadora as string,
  responsableDefault: s.responsable_default as string,
  estado: s.estado as string,
  titularServicio: (s.titular_servicio as string | null) ?? null,
  periodicidad: (s.periodicidad as string | null) ?? null,
  diaVencimiento: (s.dia_vencimiento as number | null) ?? null,
  montoEstimado: s.monto_estimado === null || s.monto_estimado === undefined ? null : Number(s.monto_estimado),
  montoEstimadoMoneda: (s.monto_estimado_moneda as "ARS" | "USD" | null) ?? null,
  debitoAutomatico: Boolean(s.debito_automatico),
  sitioBoletas: (s.sitio_boletas as string | null) ?? null,
  observaciones: (s.observaciones as string | null) ?? null,
});

export const listarConceptos = cache(async (): Promise<ConceptoOpcion[]> => {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.from("concepto").select("id, nombre, estado").is("deleted_at", null).order("nombre");
  return (data ?? []).map((c) => ({ id: c.id as string, nombre: c.nombre as string, estado: c.estado as string }));
});

export const serviciosDelBien = cache(async (bienId: string): Promise<Servicio[]> => {
  const supabase = await crearClienteServidor();
  const [{ data }, conceptos] = await Promise.all([
    supabase.from("bien_servicio").select("*").eq("bien_id", bienId).is("deleted_at", null),
    listarConceptos(),
  ]);
  const nombre = new Map(conceptos.map((c) => [c.id, c.nombre]));
  return (data ?? [])
    .map((s) => aServicio(s, nombre.get(s.concepto_id as string) ?? "—"))
    .sort((a, b) => Number(b.estado === "activo") - Number(a.estado === "activo") || a.concepto.localeCompare(b.concepto));
});

// Empresas ya cargadas, para sugerirlas al cargar un servicio nuevo.
export const empresasCargadas = cache(async (): Promise<string[]> => {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.from("bien_servicio").select("empresa_prestadora").is("deleted_at", null);
  return [...new Set((data ?? []).map((s) => s.empresa_prestadora as string))].sort((a, b) => a.localeCompare(b));
});
