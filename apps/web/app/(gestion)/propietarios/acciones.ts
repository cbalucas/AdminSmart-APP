"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { carpetaAvatarPropietario, generarUuidV7, hayNombreDuplicado, impedimentosDeBaja } from "@ai/domain";
import { aFilaPropietario, leerFormularioPropietario, type EstadoFormulario } from "@/lib/formulario-propietario";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { usuarioActual } from "@/lib/usuario-actual";

async function nombresExistentes(excluirId?: string): Promise<string[]> {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.from("propietario").select("id, nombre_razon_social").is("deleted_at", null);
  return (data ?? []).filter((p) => p.id !== excluirId).map((p) => p.nombre_razon_social as string);
}

// P-13 Alta. La base crea sola el bien Gastos varios del propietario (PROP-06).
export async function crearPropietario(_anterior: EstadoFormulario, formulario: FormData): Promise<EstadoFormulario> {
  const { usuario } = await usuarioActual();
  if (!usuario) return { error: "propietarios.error_guardar" };

  const leido = leerFormularioPropietario(formulario);
  if (!leido.ok) return { errores: leido.errores };

  // PRO-01: no bloquea; advierte y pide confirmación.
  if (formulario.get("confirmarDuplicado") !== "1" && hayNombreDuplicado(leido.datos.nombre, await nombresExistentes())) {
    return { duplicado: true };
  }

  const supabase = await crearClienteServidor();
  const id = generarUuidV7();
  const { error } = await supabase
    .from("propietario")
    .insert({ id, organizacion_id: usuario.organizacionId, ...aFilaPropietario(leido.datos) });
  if (error) return { error: "propietarios.error_guardar" };

  revalidatePath("/propietarios");
  redirect(`/propietarios/${id}`);
}

// P-13 Edición.
export async function actualizarPropietario(
  id: string,
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  const leido = leerFormularioPropietario(formulario);
  if (!leido.ok) return { errores: leido.errores };

  if (
    formulario.get("confirmarDuplicado") !== "1" &&
    hayNombreDuplicado(leido.datos.nombre, await nombresExistentes(id))
  ) {
    return { duplicado: true };
  }

  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("propietario").update(aFilaPropietario(leido.datos)).eq("id", id);
  if (error) return { error: "propietarios.error_guardar" };

  revalidatePath("/propietarios");
  redirect(`/propietarios/${id}`);
}

export interface ResultadoCambioEstado {
  /** Motivos que impiden la baja (PRO-02), como claves de texto. */
  impedimentos?: string[];
  error?: string;
}

const ESTADOS_PENDIENTES = ["a_completar", "pendiente", "vencida"];

// PRO-02: se da de baja solo sin bienes activos (salvo Gastos varios), sin obligaciones pendientes y con saldo cero.
export async function desactivarPropietario(id: string): Promise<ResultadoCambioEstado> {
  const supabase = await crearClienteServidor();

  const { data: vinculos } = await supabase
    .from("bien_propietario")
    .select("bien_id")
    .eq("propietario_id", id)
    .is("deleted_at", null);
  const bienIds = (vinculos ?? []).map((v) => v.bien_id as string);

  const { data: bienes } = bienIds.length
    ? await supabase.from("bien").select("id, es_gastos_varios, estado").in("id", bienIds).is("deleted_at", null)
    : { data: [] };
  const bienesActivos = (bienes ?? []).filter(
    (b) => !b.es_gastos_varios && !["vendido", "de_baja"].includes(b.estado as string),
  ).length;

  const { data: obligaciones } = bienIds.length
    ? await supabase.from("obligacion").select("id").in("bien_id", bienIds).eq("responsable", "propietario")
    : { data: [] };
  const obligacionIds = (obligaciones ?? []).map((o) => o.id as string);
  const { data: estados } = obligacionIds.length
    ? await supabase.from("obligacion_estado").select("estado").in("obligacion_id", obligacionIds)
    : { data: [] };
  const obligacionesPendientes = (estados ?? []).filter((e) => ESTADOS_PENDIENTES.includes(e.estado as string)).length;

  const { data: saldos } = await supabase.from("saldo_propietario").select("moneda, saldo").eq("propietario_id", id);
  const saldoDe = (moneda: string) => Number(saldos?.find((s) => s.moneda === moneda)?.saldo ?? 0);

  const motivos = impedimentosDeBaja({
    bienesActivos,
    obligacionesPendientes,
    saldoArs: saldoDe("ARS"),
    saldoUsd: saldoDe("USD"),
  });
  if (motivos.length > 0) return { impedimentos: motivos.map((m) => `propietarios.impide_${m}`) };

  const { error } = await supabase.from("propietario").update({ estado: "inactivo" }).eq("id", id);
  if (error) return { error: "propietarios.error_estado" };
  await cambiarGastosVarios(id, "de_baja");

  revalidatePath("/propietarios");
  revalidatePath(`/propietarios/${id}`);
  return {};
}

export async function reactivarPropietario(id: string): Promise<ResultadoCambioEstado> {
  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("propietario").update({ estado: "activo" }).eq("id", id);
  if (error) return { error: "propietarios.error_estado" };
  await cambiarGastosVarios(id, "activo");

  revalidatePath("/propietarios");
  revalidatePath(`/propietarios/${id}`);
  return {};
}

// PRO-02: el Gastos varios se da de baja (y se reactiva) junto con su propietario.
async function cambiarGastosVarios(propietarioId: string, estado: "activo" | "de_baja") {
  const supabase = await crearClienteServidor();
  const { data: vinculos } = await supabase.from("bien_propietario").select("bien_id").eq("propietario_id", propietarioId);
  const ids = (vinculos ?? []).map((v) => v.bien_id as string);
  if (ids.length === 0) return;
  await supabase.from("bien").update({ estado }).in("id", ids).eq("es_gastos_varios", true);
}

// PRO-12: guarda la ruta de la foto ya subida al almacén (o la quita con null). La ruta debe estar
// en la carpeta de este propietario y de esta administración: no se acepta cualquier archivo.
export async function guardarAvatarPropietario(id: string, ruta: string | null): Promise<ResultadoCambioEstado> {
  const { usuario } = await usuarioActual();
  if (!usuario) return { error: "avatar.error_subir" };
  if (ruta !== null && !ruta.startsWith(carpetaAvatarPropietario(usuario.organizacionId, id))) {
    return { error: "avatar.error_subir" };
  }
  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("propietario").update({ avatar_path: ruta }).eq("id", id);
  if (error) return { error: "avatar.error_subir" };
  revalidatePath("/propietarios");
  revalidatePath(`/propietarios/${id}`);
  return {};
}
