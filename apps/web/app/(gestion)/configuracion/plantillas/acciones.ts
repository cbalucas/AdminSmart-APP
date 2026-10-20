"use server";

import { revalidatePath } from "next/cache";
import { CANALES_PLANTILLA, DOCUMENTOS_PLANTILLA, generarUuidV7, validarPlantilla, type CanalPlantilla, type DocumentoPlantilla } from "@ai/domain";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { usuarioActual } from "@/lib/usuario-actual";

export interface EstadoPlantilla {
  /** Clave de texto del error y, si hay datos desconocidos, cuáles son. */
  error?: string;
  desconocidas?: string[];
  guardado?: boolean;
  restaurado?: boolean;
}

const esDocumento = (v: string): v is DocumentoPlantilla => (DOCUMENTOS_PLANTILLA as readonly string[]).includes(v);
const esCanal = (v: string): v is CanalPlantilla => (CANALES_PLANTILLA as readonly string[]).includes(v);

// P-49 Guardar una plantilla (solo administrador). Un dato entre llaves desconocido impide guardar (PLA-02).
export async function guardarPlantilla(documento: string, canal: string, asunto: string, cuerpo: string): Promise<EstadoPlantilla> {
  const { usuario } = await usuarioActual();
  if (!usuario?.roles.includes("administrador")) return { error: "plantillas.solo_administrador" };
  if (!esDocumento(documento) || !esCanal(canal)) return { error: "plantillas.error_guardar" };

  const invalida = validarPlantilla({ documento, canal, asunto, cuerpo });
  if (invalida) return { error: invalida.error, desconocidas: "desconocidas" in invalida ? invalida.desconocidas : undefined };

  const supabase = await crearClienteServidor();
  const { data: existente } = await supabase
    .from("plantilla_envio")
    .select("id")
    .eq("documento", documento)
    .eq("canal", canal)
    .eq("idioma", "es")
    .is("deleted_at", null)
    .maybeSingle();
  const valores = { asunto: canal === "email" ? asunto.trim() : null, cuerpo: cuerpo.trim() };
  const { error } = existente
    ? await supabase.from("plantilla_envio").update(valores).eq("id", existente.id as string)
    : await supabase.from("plantilla_envio").insert({ id: generarUuidV7(), organizacion_id: usuario.organizacionId, documento, canal, idioma: "es", ...valores });
  if (error) return { error: "plantillas.error_guardar" };

  revalidatePath("/configuracion/plantillas");
  return { guardado: true };
}

// P-49 Restaurar el texto original: la plantilla propia se da de baja y vuelve a regir la de fábrica.
export async function restaurarPlantilla(documento: string, canal: string): Promise<EstadoPlantilla> {
  const { usuario } = await usuarioActual();
  if (!usuario?.roles.includes("administrador")) return { error: "plantillas.solo_administrador" };
  if (!esDocumento(documento) || !esCanal(canal)) return { error: "plantillas.error_guardar" };
  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from("plantilla_envio")
    .update({ deleted_at: new Date().toISOString() })
    .eq("documento", documento)
    .eq("canal", canal)
    .eq("idioma", "es")
    .is("deleted_at", null);
  if (error) return { error: "plantillas.error_guardar" };
  revalidatePath("/configuracion/plantillas");
  return { restaurado: true };
}
