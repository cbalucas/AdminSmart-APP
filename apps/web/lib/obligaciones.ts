import { cache } from "react";
import type { EstadoObligacion } from "@ai/domain";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export interface FilaObligacion {
  id: string;
  bienId: string;
  bienServicioId: string | null;
  conceptoId: string;
  concepto: string;
  empresa: string | null;
  periodo: string;
  vencimiento: string | null;
  monto: number | null;
  moneda: "ARS" | "USD";
  responsable: "propietario" | "inquilino";
  esRecurrente: boolean;
  frecuencia: string | null;
  descripcion: string | null;
  estado: EstadoObligacion;
}

// Todas las obligaciones que el usuario puede ver (la base filtra por rol), con su estado calculado.
export const listarObligaciones = cache(async (): Promise<FilaObligacion[]> => {
  const supabase = await crearClienteServidor();
  const [{ data: obligaciones }, { data: estados }, { data: conceptos }, { data: servicios }] = await Promise.all([
    supabase.from("obligacion").select("*").is("deleted_at", null),
    supabase.from("obligacion_estado").select("obligacion_id, estado"),
    supabase.from("concepto").select("id, nombre"),
    supabase.from("bien_servicio").select("id, empresa_prestadora").is("deleted_at", null),
  ]);
  const estadoDe = new Map((estados ?? []).map((e) => [e.obligacion_id as string, e.estado as EstadoObligacion]));
  const conceptoDe = new Map((conceptos ?? []).map((c) => [c.id as string, c.nombre as string]));
  const empresaDe = new Map((servicios ?? []).map((s) => [s.id as string, s.empresa_prestadora as string]));
  return (obligaciones ?? []).map((o) => ({
    id: o.id as string,
    bienId: o.bien_id as string,
    bienServicioId: (o.bien_servicio_id as string | null) ?? null,
    conceptoId: o.concepto_id as string,
    concepto: conceptoDe.get(o.concepto_id as string) ?? "—",
    empresa: o.bien_servicio_id ? (empresaDe.get(o.bien_servicio_id as string) ?? null) : null,
    periodo: o.periodo as string,
    vencimiento: (o.vencimiento as string | null) ?? null,
    monto: o.monto === null || o.monto === undefined ? null : Number(o.monto),
    moneda: o.moneda as "ARS" | "USD",
    responsable: o.responsable as "propietario" | "inquilino",
    esRecurrente: Boolean(o.es_recurrente),
    frecuencia: (o.frecuencia as string | null) ?? null,
    descripcion: (o.descripcion as string | null) ?? null,
    estado: estadoDe.get(o.id as string) ?? "pendiente",
  }));
});
