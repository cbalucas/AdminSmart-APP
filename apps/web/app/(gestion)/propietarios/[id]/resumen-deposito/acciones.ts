"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { generarUuidV7 } from "@ai/domain";
import { generarPdfResumen } from "@/lib/pdf/generar";
import { obtenerPropietario } from "@/lib/propietarios";
import { calcularResumenDelPropietario, leerHorizonte } from "@/lib/resumen-deposito";
import { esGestion } from "@/lib/menu";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { usuarioActual } from "@/lib/usuario-actual";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const dias = (desde: string, hasta: string) => Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86_400_000);

/**
 * LIQ-08: genera el resumen de depósito oficial. Registra el resumen con su número DEP-AAAA-NNNN y los montos por
 * moneda, arma el PDF, lo guarda en el almacén privado y vuelve a la pantalla con el aviso de descarga.
 * El número se consume solo acá: la vista previa no lo usa.
 */
export async function generarResumenOficial(propietarioId: string, h: string, fecha: string, _formulario: FormData): Promise<void> {
  const { usuario } = await usuarioActual();
  if (!usuario || !esGestion(usuario.roles) || !UUID.test(propietarioId)) redirect(`/propietarios/${propietarioId}/resumen-deposito`);
  const volver = (estado: string) => {
    const q = new URLSearchParams();
    if (h) q.set("h", h);
    if (fecha) q.set("fecha", fecha);
    q.set("generado", estado);
    return `/propietarios/${propietarioId}/resumen-deposito?${q.toString()}`;
  };

  const p = await obtenerPropietario(propietarioId);
  if (!p) redirect(volver("error"));
  const r = await calcularResumenDelPropietario(propietarioId, leerHorizonte(h, fecha, p.horizonteResumenDias));
  if (!r) redirect(volver("error"));

  const supabase = await crearClienteServidor();
  const id = generarUuidV7();
  const { data: registro, error } = await supabase.rpc("registrar_resumen_deposito", {
    p_organizacion: usuario.organizacionId,
    p_propietario: propietarioId,
    p_fecha: r.hoy,
    p_horizonte_dias: dias(r.hoy, r.fechaLimite),
    p_fecha_limite: r.fechaLimite,
    p_montos: r.resumenes.map((x) => ({
      moneda: x.moneda,
      obligaciones_pendientes: x.sumaObligaciones,
      saldo_disponible: x.saldoDisponible,
      reposicion_fondo: x.reposicionFondo,
      a_depositar: x.aDepositar,
      saldo_a_transferir: x.saldoATransferir,
    })),
    p_id: id,
  });
  if (error || !registro) redirect(volver("error"));
  const numero = (registro as { numero: string }).numero;

  // PDF: se guarda con su propio nombre (el número no se reutiliza) y se enlaza al registro.
  const ruta = `${usuario.organizacionId}/resumenes/${propietarioId}/${numero}.pdf`;
  try {
    const pdf = await generarPdfResumen(r, numero);
    const { error: errorSubida } = await supabase.storage.from("informes").upload(ruta, pdf, { contentType: "application/pdf" });
    if (errorSubida) throw errorSubida;
    const { error: errorEnlace } = await supabase.from("resumen_deposito").update({ pdf_path: ruta }).eq("id", id);
    if (errorEnlace) throw errorEnlace;
  } catch {
    // El resumen quedó registrado con su número pero sin PDF: se avisa para volver a generarlo.
    redirect(volver("sin_pdf"));
  }

  revalidatePath(`/propietarios/${propietarioId}/resumen-deposito`);
  redirect(volver(id));
}
