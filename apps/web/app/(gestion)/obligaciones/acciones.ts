"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { generarUuidV7, proximoPeriodo, puedeModificarObligacion, type Frecuencia } from "@ai/domain";
import { leerFormularioObligacion, type EstadoFormularioObligacion } from "@/lib/formulario-obligacion";
import { leerAdjuntos, registrarDocumentos } from "@/lib/documentos";
import { claveObligacion, generarOcurrenciasPendientes } from "@/lib/obligaciones";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { usuarioActual } from "@/lib/usuario-actual";

// P-27 Alta de obligación (administrador y operador del bien).
export async function crearObligacion(_a: EstadoFormularioObligacion, formulario: FormData): Promise<EstadoFormularioObligacion> {
  const { usuario } = await usuarioActual();
  if (!usuario) return { error: "obligaciones.error_guardar" };
  const leido = leerFormularioObligacion(formulario);
  if (!leido.ok) return { errores: leido.errores };
  const d = leido.datos;

  const supabase = await crearClienteServidor();
  // OBL-03: un servicio no tiene dos obligaciones activas del mismo período. Se avisa antes de que la base lo rechace.
  if (d.bienServicioId) {
    const { data } = await supabase
      .from("obligacion")
      .select("id")
      .eq("bien_servicio_id", d.bienServicioId)
      .eq("periodo", d.periodo)
      .eq("anulada", false)
      .is("deleted_at", null)
      .limit(1);
    if (data?.length) return { errores: { periodo: "obligaciones.periodo_repetido" } };
  }

  // El id lo genera el formulario para poder subir la boleta antes de guardar (UUID v7 en el cliente).
  const idForm = String(formulario.get("id") ?? "");
  const id = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idForm) ? idForm : generarUuidV7();
  const { error } = await supabase.from("obligacion").insert({
    id,
    organizacion_id: usuario.organizacionId,
    bien_servicio_id: d.bienServicioId,
    bien_id: d.bienId,
    concepto_id: d.conceptoId,
    periodo: d.periodo,
    es_recurrente: d.esRecurrente,
    frecuencia: d.esRecurrente ? d.frecuencia : null,
    monto: d.monto,
    moneda: d.moneda,
    responsable: d.responsable,
    vencimiento: d.vencimiento,
    descripcion: d.descripcion,
    codigo_pago: d.codigoPago,
    observaciones: d.observaciones,
  });
  if (error) return { error: "obligaciones.error_guardar" };

  const adjuntos = await registrarDocumentos(usuario.organizacionId, "obligacion", id, leerAdjuntos(formulario));
  await generarOcurrenciasPendientes(usuario.organizacionId);
  revalidatePath("/obligaciones");
  // La obligación ya está guardada: si falló el registro de la boleta, se la ofrece de nuevo desde la edición.
  redirect(adjuntos.error ? `/obligaciones/${id}/editar` : "/obligaciones");
}

// P-27 Edición. Bien, servicio, concepto y período quedan fijos; una obligación pagada no se modifica (OBL-06).
export async function actualizarObligacion(
  id: string,
  _a: EstadoFormularioObligacion,
  formulario: FormData,
): Promise<EstadoFormularioObligacion> {
  const { usuario } = await usuarioActual();
  if (!usuario) return { error: "obligaciones.error_guardar" };
  const leido = leerFormularioObligacion(formulario);
  if (!leido.ok) return { errores: leido.errores };
  const d = leido.datos;

  const supabase = await crearClienteServidor();
  const [{ data: actual }, { data: estado }] = await Promise.all([
    supabase.from("obligacion").select("*").eq("id", id).is("deleted_at", null).maybeSingle(),
    supabase.from("obligacion_estado").select("estado").eq("obligacion_id", id).maybeSingle(),
  ]);
  if (!actual) return { error: "obligaciones.no_encontrada" };
  if (!puedeModificarObligacion({ pagada: estado?.estado === "pagada", anulada: Boolean(actual.anulada) })) {
    return { error: "obligaciones.error_no_modificable" };
  }

  const recurrente = d.esRecurrente;
  const frecuencia = recurrente ? d.frecuencia : null;

  // OBL-10: al quitar la marca o cambiar la frecuencia, se elimina la ocurrencia futura que siga A completar
  // y se vuelve a generar con la frecuencia nueva.
  if (actual.es_recurrente && actual.frecuencia && (!recurrente || frecuencia !== actual.frecuencia)) {
    const futuro = proximoPeriodo(actual.periodo as string, actual.frecuencia as Frecuencia);
    const { data: candidatas } = await supabase
      .from("obligacion")
      .select("*")
      .eq("periodo", futuro)
      .eq("es_recurrente", true)
      .is("monto", null)
      .eq("anulada", false)
      .is("deleted_at", null);
    const clave = claveObligacion(actual);
    for (const c of (candidatas ?? []).filter((x) => claveObligacion(x) === clave)) {
      const { data: e } = await supabase.from("obligacion_estado").select("estado").eq("obligacion_id", c.id).maybeSingle();
      if (e?.estado === "a_completar") {
        await supabase.from("obligacion").update({ deleted_at: new Date().toISOString() }).eq("id", c.id);
      }
    }
  }

  const { error } = await supabase
    .from("obligacion")
    .update({
      es_recurrente: recurrente,
      frecuencia,
      monto: d.monto,
      moneda: d.moneda,
      responsable: d.responsable,
      vencimiento: d.vencimiento,
            codigo_pago: d.codigoPago,
      observaciones: d.observaciones,
    })
    .eq("id", id);
  if (error) return { error: "obligaciones.error_guardar" };

  const adjuntos = await registrarDocumentos(usuario.organizacionId, "obligacion", id, leerAdjuntos(formulario));
  if (adjuntos.error) return { error: adjuntos.error };
  await generarOcurrenciasPendientes(usuario.organizacionId);
  revalidatePath("/obligaciones");
  redirect("/obligaciones");
}
