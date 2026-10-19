import { cache } from "react";
import { generarUuidV7, siguienteAGenerar, type EstadoObligacion, type Frecuencia } from "@ai/domain";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export interface FilaObligacion {
  id: string;
  bienId: string;
  bienServicioId: string | null;
  conceptoId: string;
  concepto: string;
  empresa: string | null;
  periodo: string;
  vencimiento: string | null;
  monto: number | null;
  moneda: "ARS" | "USD";
  responsable: "propietario" | "inquilino";
  esRecurrente: boolean;
  frecuencia: string | null;
  descripcion: string | null;
  estado: EstadoObligacion;
}

// Todas las obligaciones que el usuario puede ver (la base filtra por rol), con su estado calculado.
export const listarObligaciones = cache(async (): Promise<FilaObligacion[]> => {
  const supabase = await crearClienteServidor();
  const [{ data: obligaciones }, { data: estados }, { data: conceptos }, { data: servicios }] = await Promise.all([
    supabase.from("obligacion").select("*").is("deleted_at", null),
    supabase.from("obligacion_estado").select("obligacion_id, estado"),
    supabase.from("concepto").select("id, nombre"),
    supabase.from("bien_servicio").select("id, empresa_prestadora").is("deleted_at", null),
  ]);
  const estadoDe = new Map((estados ?? []).map((e) => [e.obligacion_id as string, e.estado as EstadoObligacion]));
  const conceptoDe = new Map((conceptos ?? []).map((c) => [c.id as string, c.nombre as string]));
  const empresaDe = new Map((servicios ?? []).map((s) => [s.id as string, s.empresa_prestadora as string]));
  return (obligaciones ?? []).map((o) => ({
    id: o.id as string,
    bienId: o.bien_id as string,
    bienServicioId: (o.bien_servicio_id as string | null) ?? null,
    conceptoId: o.concepto_id as string,
    concepto: conceptoDe.get(o.concepto_id as string) ?? "—",
    empresa: o.bien_servicio_id ? (empresaDe.get(o.bien_servicio_id as string) ?? null) : null,
    periodo: o.periodo as string,
    vencimiento: (o.vencimiento as string | null) ?? null,
    monto: o.monto === null || o.monto === undefined ? null : Number(o.monto),
    moneda: o.moneda as "ARS" | "USD",
    responsable: o.responsable as "propietario" | "inquilino",
    esRecurrente: Boolean(o.es_recurrente),
    frecuencia: (o.frecuencia as string | null) ?? null,
    descripcion: (o.descripcion as string | null) ?? null,
    estado: estadoDe.get(o.id as string) ?? "pendiente",
  }));
});

export const fechaHoy = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Argentina/Cordoba" }).format(new Date());

/** Clave que identifica "el mismo gasto" a lo largo de los períodos: el servicio, o bien + concepto + descripción. */
export const claveObligacion = (o: { bien_servicio_id: unknown; bien_id: unknown; concepto_id: unknown; descripcion: unknown }) =>
  o.bien_servicio_id ? `s:${o.bien_servicio_id}` : `g:${o.bien_id}|${o.concepto_id}|${String(o.descripcion ?? "").trim().toLowerCase()}`;

// OBL-05, OBL-09: crea las ocurrencias siguientes que falten (sin monto ni vencimiento, A completar).
// Se ejecuta al abrir Obligaciones o el Inicio, sin proceso programado. Devuelve cuántas creó.
export async function generarOcurrenciasPendientes(organizacionId: string): Promise<number> {
  const supabase = await crearClienteServidor();
  const hoy = fechaHoy();
  let creadas = 0;
  for (let vuelta = 0; vuelta < 24; vuelta++) {
    const { data } = await supabase.from("obligacion").select("*").is("deleted_at", null).eq("anulada", false);
    const todas = data ?? [];
    const periodosPorClave = new Map<string, string[]>();
    for (const o of todas) {
      const c = claveObligacion(o);
      periodosPorClave.set(c, [...(periodosPorClave.get(c) ?? []), o.periodo as string]);
    }
    const nuevas: Record<string, unknown>[] = [];
    const yaPlanificadas = new Set<string>();
    for (const o of todas) {
      const clave = claveObligacion(o);
      const periodo = siguienteAGenerar(
        { periodo: o.periodo as string, esRecurrente: Boolean(o.es_recurrente), frecuencia: (o.frecuencia as Frecuencia | null) ?? null, anulada: false },
        periodosPorClave.get(clave) ?? [],
        hoy,
      );
      if (!periodo || yaPlanificadas.has(`${clave}@${periodo}`)) continue;
      yaPlanificadas.add(`${clave}@${periodo}`);
      nuevas.push({
        id: generarUuidV7(),
        organizacion_id: organizacionId,
        bien_servicio_id: o.bien_servicio_id,
        bien_id: o.bien_id,
        concepto_id: o.concepto_id,
        periodo,
        es_recurrente: true,
        frecuencia: o.frecuencia,
        monto: null,
        moneda: o.moneda,
        responsable: o.responsable,
        vencimiento: null,
        descripcion: o.descripcion,
        codigo_pago: o.codigo_pago,
      });
    }
    if (nuevas.length === 0) break;
    // Una por una: si otra visita ya la creó, la base la rechaza (OBL-03) y se sigue con las demás.
    let alguna = false;
    for (const fila of nuevas) {
      const { error } = await supabase.from("obligacion").insert(fila);
      if (!error) {
        creadas++;
        alguna = true;
      }
    }
    if (!alguna) break;
  }
  return creadas;
}
