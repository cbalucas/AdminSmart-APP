import { generarUuidV7 } from "@ai/domain";
import { generarPdfResumen } from "@/lib/pdf/generar";
import type { ResumenDelPropietario } from "@/lib/resumen-deposito";
import { crearClienteServidor } from "@/lib/supabase/servidor";

const dias = (desde: string, hasta: string) => Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86_400_000);

export type ResultadoResumenOficial = { ok: true; id: string; numero: string } | { ok: false; motivo: "error" | "sin_pdf"; numero?: string };

/**
 * LIQ-08: crea el resumen de depósito oficial. Registra el resumen con su número DEP-AAAA-NNNN y los montos por moneda,
 * arma el PDF y lo guarda en el almacén privado de informes. El número se consume solo acá: la vista previa no lo usa.
 */
export async function crearResumenOficial(r: ResumenDelPropietario, organizacionId: string): Promise<ResultadoResumenOficial> {
  const supabase = await crearClienteServidor();
  const id = generarUuidV7();
  const { data: registro, error } = await supabase.rpc("registrar_resumen_deposito", {
    p_organizacion: organizacionId,
    p_propietario: r.propietarioId,
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
  if (error || !registro) return { ok: false, motivo: "error" };
  const numero = (registro as { numero: string }).numero;

  // El PDF se guarda con su propio nombre (número + id del registro): nunca se pisa un archivo y no choca con otro anterior.
  const ruta = `${organizacionId}/resumenes/${r.propietarioId}/${numero}-${id}.pdf`;
  try {
    const pdf = await generarPdfResumen(r, numero);
    const { error: errorSubida } = await supabase.storage.from("informes").upload(ruta, pdf, { contentType: "application/pdf" });
    if (errorSubida) throw errorSubida;
    const { error: errorEnlace } = await supabase.from("resumen_deposito").update({ pdf_path: ruta }).eq("id", id);
    if (errorEnlace) throw errorEnlace;
  } catch {
    return { ok: false, motivo: "sin_pdf", numero };
  }
  return { ok: true, id, numero };
}

/**
 * Un resumen oficial de hoy, con la misma fecha límite y los mismos montos, que ya tiene PDF: se reutiliza
 * para no gastar un número nuevo cada vez que se vuelve a enviar lo mismo.
 */
export async function resumenOficialVigente(r: ResumenDelPropietario): Promise<{ id: string; numero: string } | null> {
  const supabase = await crearClienteServidor();
  const { data } = await supabase
    .from("resumen_deposito")
    .select("id, numero, pdf_path")
    .eq("propietario_id", r.propietarioId)
    .eq("fecha", r.hoy)
    .eq("fecha_limite", r.fechaLimite)
    .not("pdf_path", "is", null)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(5);
  for (const c of data ?? []) {
    const { data: montos } = await supabase.from("resumen_deposito_monto").select("moneda, a_depositar").eq("resumen_deposito_id", c.id as string).is("deleted_at", null);
    const guardado = new Map((montos ?? []).map((m) => [m.moneda as string, Number(m.a_depositar)]));
    const igual = r.resumenes.length === guardado.size && r.resumenes.every((x) => guardado.get(x.moneda) === x.aDepositar);
    if (igual) return { id: c.id as string, numero: c.numero as string };
  }
  return null;
}
