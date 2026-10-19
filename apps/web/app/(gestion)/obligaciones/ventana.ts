"use server";

import { revalidatePath } from "next/cache";
import { aCentavos } from "@ai/domain";
import { claveObligacion } from "@/lib/obligaciones";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { usuarioActual } from "@/lib/usuario-actual";

export interface GastoCompletado {
  id: string;
  monto: string;
  vencimiento: string;
}

export interface ResultadoVentana {
  /** Ids de los gastos que quedaron guardados. */
  guardados: string[];
  error?: string;
}

// P-48 Guarda solo los gastos con monto; el vencimiento es opcional. Pasan de A completar a Pendiente.
export async function completarGastos(gastos: GastoCompletado[]): Promise<ResultadoVentana> {
  const { usuario } = await usuarioActual();
  if (!usuario) return { guardados: [], error: "ventana.error_guardar" };
  const supabase = await crearClienteServidor();
  const guardados: string[] = [];
  let hayError = false;
  for (const g of gastos) {
    const centavos = aCentavos(g.monto);
    const vencimientoValido = g.vencimiento === "" || /^\d{4}-\d{2}-\d{2}$/.test(g.vencimiento);
    if (centavos === null || centavos <= 0 || !vencimientoValido) {
      hayError = true;
      continue;
    }
    // Solo se completa lo que sigue sin monto: nunca se pisa un importe ya cargado.
    const { data, error } = await supabase
      .from("obligacion")
      .update({ monto: centavos, vencimiento: g.vencimiento === "" ? null : g.vencimiento })
      .eq("id", g.id)
      .is("monto", null)
      .is("deleted_at", null)
      .select("id");
    if (error || !data?.length) hayError = true;
    else guardados.push(g.id);
  }
  revalidatePath("/obligaciones");
  return hayError ? { guardados, error: "ventana.error_algunos" } : { guardados };
}

// P-48 "Dejar de repetir": se elimina esta ocurrencia sin monto y se quita la marca a la anterior (OBL-10).
export async function dejarDeRepetir(id: string): Promise<{ error?: string }> {
  const { usuario } = await usuarioActual();
  if (!usuario) return { error: "ventana.error_guardar" };
  const supabase = await crearClienteServidor();
  const { data: actual } = await supabase.from("obligacion").select("*").eq("id", id).is("deleted_at", null).is("monto", null).maybeSingle();
  if (!actual) return { error: "ventana.error_guardar" };

  const { data: mismas } = await supabase.from("obligacion").select("*").is("deleted_at", null).eq("anulada", false);
  const clave = claveObligacion(actual);
  const anteriores = (mismas ?? [])
    .filter((o) => claveObligacion(o) === clave && (o.periodo as string) < (actual.periodo as string))
    .sort((a, b) => (b.periodo as string).localeCompare(a.periodo as string));

  const { error } = await supabase.from("obligacion").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) return { error: "ventana.error_guardar" };
  if (anteriores[0]) {
    await supabase.from("obligacion").update({ es_recurrente: false, frecuencia: null }).eq("id", anteriores[0].id as string);
  }
  revalidatePath("/obligaciones");
  return {};
}
