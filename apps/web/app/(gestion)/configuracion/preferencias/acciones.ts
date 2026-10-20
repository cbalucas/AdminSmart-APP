"use server";

import { revalidatePath } from "next/cache";
import { esquemaPreferencias } from "@ai/domain";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { usuarioActual } from "@/lib/usuario-actual";

export interface EstadoPreferencias {
  errores?: Record<string, string>;
  error?: string;
  guardado?: boolean;
}

// P-43 Preferencias generales (solo administrador).
export async function guardarPreferencias(_a: EstadoPreferencias, formulario: FormData): Promise<EstadoPreferencias> {
  const { usuario } = await usuarioActual();
  if (!usuario?.roles.includes("administrador")) return { error: "administracion.solo_administrador" };
  const dias = String(formulario.get("diasAvisoRecurrentes") ?? "").trim();
  const r = esquemaPreferencias.safeParse({
    diasAvisoRecurrentes: dias === "" ? Number.NaN : Number(dias),
    monedaDefecto: String(formulario.get("monedaDefecto") ?? ""),
  });
  if (!r.success) {
    const errores: Record<string, string> = {};
    for (const issue of r.error.issues) errores[String(issue.path[0])] ??= issue.message.startsWith("validacion.") ? issue.message : "preferencias.error_guardar";
    return { errores };
  }
  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from("organizacion")
    .update({ dias_aviso_recurrentes: r.data.diasAvisoRecurrentes, moneda_defecto: r.data.monedaDefecto })
    .eq("id", usuario.organizacionId);
  if (error) return { error: "preferencias.error_guardar" };
  revalidatePath("/configuracion/preferencias");
  return { guardado: true };
}
