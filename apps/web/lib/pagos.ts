import { crearClienteServidor } from "@/lib/supabase/servidor";

export interface PagoVigente {
  id: string;
  obligacionId: string;
  fecha: string;
  importe: number;
  pagadoPor: "administracion" | "propietario_directo" | "inquilino";
  medio: string | null;
  nroOperacion: string | null;
  observaciones: string | null;
}

// Pago vigente (no anulado ni en conflicto) de cada obligación: obligacionId → pago.
export async function pagosVigentesDe(obligacionIds: string[]): Promise<Map<string, PagoVigente>> {
  const mapa = new Map<string, PagoVigente>();
  if (obligacionIds.length === 0) return mapa;
  const supabase = await crearClienteServidor();
  const { data } = await supabase
    .from("pago")
    .select("id, obligacion_id, fecha, importe, pagado_por, medio, nro_operacion, observaciones")
    .in("obligacion_id", obligacionIds)
    .eq("anulado", false)
    .eq("en_conflicto", false)
    .is("deleted_at", null);
  for (const p of data ?? []) {
    mapa.set(p.obligacion_id as string, {
      id: p.id as string,
      obligacionId: p.obligacion_id as string,
      fecha: p.fecha as string,
      importe: Number(p.importe),
      pagadoPor: p.pagado_por as PagoVigente["pagadoPor"],
      medio: (p.medio as string | null) ?? null,
      nroOperacion: (p.nro_operacion as string | null) ?? null,
      observaciones: (p.observaciones as string | null) ?? null,
    });
  }
  return mapa;
}
