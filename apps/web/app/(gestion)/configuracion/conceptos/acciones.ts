"use server";

import { revalidatePath } from "next/cache";
import { esquemaConcepto, generarUuidV7, mismoConcepto } from "@ai/domain";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { usuarioActual } from "@/lib/usuario-actual";

export interface ResultadoConcepto {
  /** Clave de texto del error, si lo hubo. */
  error?: string;
}

// El catálogo lo gestiona solo el administrador (P-42); la base también lo hace cumplir.
async function administrador() {
  const { usuario } = await usuarioActual();
  return usuario?.roles.includes("administrador") ? usuario : null;
}

async function hayOtroIgual(nombre: string, excluirId?: string): Promise<boolean> {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.from("concepto").select("id, nombre").is("deleted_at", null);
  return (data ?? []).some((c) => c.id !== excluirId && mismoConcepto(c.nombre as string, nombre));
}

export async function crearConcepto(nombre: string, categoria: string): Promise<ResultadoConcepto> {
  const usuario = await administrador();
  if (!usuario) return { error: "conceptos.error" };
  const leido = esquemaConcepto.safeParse({ nombre, categoria });
  if (!leido.success) return { error: leido.error.issues[0]?.message ?? "conceptos.error" };
  if (await hayOtroIgual(leido.data.nombre)) return { error: "conceptos.nombre_repetido" };

  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("concepto").insert({
    id: generarUuidV7(),
    organizacion_id: usuario.organizacionId,
    nombre: leido.data.nombre,
    categoria: leido.data.categoria,
  });
  if (error) return { error: "conceptos.error" };
  revalidatePath("/configuracion/conceptos");
  return {};
}

export async function actualizarConcepto(id: string, nombre: string, categoria: string): Promise<ResultadoConcepto> {
  if (!(await administrador())) return { error: "conceptos.error" };
  const leido = esquemaConcepto.safeParse({ nombre, categoria });
  if (!leido.success) return { error: leido.error.issues[0]?.message ?? "conceptos.error" };
  if (await hayOtroIgual(leido.data.nombre, id)) return { error: "conceptos.nombre_repetido" };

  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("concepto").update({ nombre: leido.data.nombre, categoria: leido.data.categoria }).eq("id", id);
  if (error) return { error: "conceptos.error" };
  revalidatePath("/configuracion/conceptos");
  return {};
}

// SERV-05: un concepto no se elimina; solo se desactiva (conserva su historial).
export async function cambiarEstadoConcepto(id: string, activo: boolean): Promise<ResultadoConcepto> {
  if (!(await administrador())) return { error: "conceptos.error" };
  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("concepto").update({ estado: activo ? "activo" : "inactivo" }).eq("id", id);
  if (error) return { error: "conceptos.error" };
  revalidatePath("/configuracion/conceptos");
  return {};
}
