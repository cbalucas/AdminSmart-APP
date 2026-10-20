"use server";

import { revalidatePath } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { usuarioActual } from "@/lib/usuario-actual";

export interface EstadoAuditoriaConfig {
  error?: string;
  guardado?: boolean;
}

// AUD-04: solo el administrador decide si se registra la auditoría de datos y para qué propietarios.
export async function guardarConfigAuditoria(_a: EstadoAuditoriaConfig, formulario: FormData): Promise<EstadoAuditoriaConfig> {
  const { usuario } = await usuarioActual();
  if (!usuario?.roles.includes("administrador")) return { error: "administracion.solo_administrador" };
  const activa = formulario.get("auditoriaActiva") === "1";
  const marcados = new Set(formulario.getAll("auditar").map(String));

  const supabase = await crearClienteServidor();
  const [{ data: org }, { data: props }] = await Promise.all([
    supabase.from("organizacion").select("auditoria_activa").eq("id", usuario.organizacionId).maybeSingle(),
    supabase.from("propietario").select("id, auditar").is("deleted_at", null),
  ]);

  // Solo se tocan los que cambiaron, para no dejar movimientos de más en la auditoría.
  if ((org?.auditoria_activa !== false) !== activa) {
    const { error } = await supabase.from("organizacion").update({ auditoria_activa: activa }).eq("id", usuario.organizacionId);
    if (error) return { error: "auditoria_config.error_guardar" };
  }
  const aActivar = (props ?? []).filter((p) => p.auditar === false && marcados.has(p.id as string)).map((p) => p.id as string);
  const aDesactivar = (props ?? []).filter((p) => p.auditar !== false && !marcados.has(p.id as string)).map((p) => p.id as string);
  if (aActivar.length > 0) {
    const { error } = await supabase.from("propietario").update({ auditar: true }).in("id", aActivar);
    if (error) return { error: "auditoria_config.error_guardar" };
  }
  if (aDesactivar.length > 0) {
    const { error } = await supabase.from("propietario").update({ auditar: false }).in("id", aDesactivar);
    if (error) return { error: "auditoria_config.error_guardar" };
  }
  revalidatePath("/configuracion/auditoria");
  revalidatePath("/auditoria");
  return { guardado: true };
}
