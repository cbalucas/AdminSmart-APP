import { cache } from "react";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export interface ConfigAuditoria {
  activa: boolean;
  propietarios: { id: string; nombre: string; auditar: boolean }[];
}

// AUD-04: si la auditoría de datos está activa y para qué propietarios.
export const obtenerConfigAuditoria = cache(async (): Promise<ConfigAuditoria> => {
  const supabase = await crearClienteServidor();
  const [{ data: org }, { data: props }] = await Promise.all([
    supabase.from("organizacion").select("auditoria_activa").limit(1).maybeSingle(),
    supabase.from("propietario").select("id, nombre_razon_social, auditar").is("deleted_at", null).order("nombre_razon_social"),
  ]);
  return {
    activa: org?.auditoria_activa !== false,
    propietarios: (props ?? []).map((p) => ({ id: p.id as string, nombre: p.nombre_razon_social as string, auditar: p.auditar !== false })),
  };
});
