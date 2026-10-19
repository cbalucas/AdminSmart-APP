"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { generarUuidV7 } from "@ai/domain";
import { aFilaServicio, leerFormularioServicio, type EstadoFormularioServicio } from "@/lib/formulario-servicio";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { usuarioActual } from "@/lib/usuario-actual";

const volverAlBien = (bienId: string) => `/bienes/${bienId}?tab=servicios`;

// SERV-01: un concepto no se repite en el mismo bien. Se avisa antes de que la base lo rechace.
async function conceptoRepetido(bienId: string, conceptoId: string, excluirId?: string): Promise<boolean> {
  const supabase = await crearClienteServidor();
  let q = supabase.from("bien_servicio").select("id").eq("bien_id", bienId).eq("concepto_id", conceptoId).is("deleted_at", null);
  if (excluirId) q = q.neq("id", excluirId);
  const { data } = await q.limit(1);
  return Boolean(data?.length);
}

// P-19 Alta de servicio o impuesto del bien (administrador y operador de ese bien).
export async function crearServicio(
  bienId: string,
  _a: EstadoFormularioServicio,
  formulario: FormData,
): Promise<EstadoFormularioServicio> {
  const { usuario } = await usuarioActual();
  if (!usuario) return { error: "servicios.error_guardar" };
  const leido = leerFormularioServicio(formulario);
  if (!leido.ok) return { errores: leido.errores };
  if (await conceptoRepetido(bienId, leido.datos.conceptoId)) return { errores: { conceptoId: "servicios.concepto_repetido" } };

  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from("bien_servicio")
    .insert({ id: generarUuidV7(), organizacion_id: usuario.organizacionId, bien_id: bienId, ...aFilaServicio(leido.datos) });
  if (error) return { error: "servicios.error_guardar" };

  revalidatePath(`/bienes/${bienId}`);
  redirect(volverAlBien(bienId));
}

export async function actualizarServicio(
  bienId: string,
  servicioId: string,
  _a: EstadoFormularioServicio,
  formulario: FormData,
): Promise<EstadoFormularioServicio> {
  const { usuario } = await usuarioActual();
  if (!usuario) return { error: "servicios.error_guardar" };
  const leido = leerFormularioServicio(formulario);
  if (!leido.ok) return { errores: leido.errores };
  if (await conceptoRepetido(bienId, leido.datos.conceptoId, servicioId)) {
    return { errores: { conceptoId: "servicios.concepto_repetido" } };
  }

  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("bien_servicio").update(aFilaServicio(leido.datos)).eq("id", servicioId).eq("bien_id", bienId);
  if (error) return { error: "servicios.error_guardar" };

  revalidatePath(`/bienes/${bienId}`);
  redirect(volverAlBien(bienId));
}

// SERV-04: un servicio inactivo deja de generar obligaciones pero conserva su historial.
export async function cambiarEstadoServicio(bienId: string, servicioId: string, activo: boolean): Promise<{ error?: string }> {
  const { usuario } = await usuarioActual();
  if (!usuario) return { error: "servicios.error_estado" };
  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from("bien_servicio")
    .update({ estado: activo ? "activo" : "inactivo" })
    .eq("id", servicioId)
    .eq("bien_id", bienId);
  if (error) return { error: "servicios.error_estado" };
  revalidatePath(`/bienes/${bienId}`);
  return {};
}
