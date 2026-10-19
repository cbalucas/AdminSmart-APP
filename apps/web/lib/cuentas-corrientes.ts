import { conSaldoAcumulado, sePuedeAnularMovimiento, type Moneda } from "@ai/domain";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export interface FilaMovimiento {
  id: string;
  fecha: string;
  bienId: string;
  tipo: string;
  descripcion: string;
  debe: number;
  haber: number;
  saldo: number;
  origenTipo: string;
  esContramovimiento: boolean;
  anulado: boolean;
  anulable: boolean;
  traspasoId: string | null;
}

// Libro de un propietario en una moneda (MOV-01). El saldo acumulado se calcula sobre todos los
// movimientos del bien filtrado (o de todos) y recién después se recortan las fechas, de modo que
// el saldo de cada fila no depende del rango que se mira.
export async function libroDelPropietario(args: {
  propietarioId: string;
  moneda: Moneda;
  bienId?: string;
  desde?: string;
  hasta?: string;
}): Promise<{ filas: FilaMovimiento[]; saldoFinal: number; saldoAnterior: number }> {
  const supabase = await crearClienteServidor();
  let q = supabase
    .from("movimiento")
    .select("id, fecha, bien_id, tipo, descripcion, debe, haber, origen_tipo, contramovimiento_de_id, traspaso_id, created_at")
    .eq("propietario_id", args.propietarioId)
    .eq("moneda", args.moneda)
    .is("deleted_at", null)
    .order("fecha")
    .order("created_at");
  if (args.bienId) q = q.eq("bien_id", args.bienId);
  const { data } = await q;
  const movs = data ?? [];

  const anulados = new Set(movs.map((m) => m.contramovimiento_de_id as string | null).filter((x): x is string => Boolean(x)));
  const base = movs.map((m) => ({
    id: m.id as string,
    fecha: m.fecha as string,
    bienId: m.bien_id as string,
    tipo: m.tipo as string,
    descripcion: m.descripcion as string,
    debe: Number(m.debe),
    haber: Number(m.haber),
    origenTipo: m.origen_tipo as string,
    esContramovimiento: m.contramovimiento_de_id !== null,
    anulado: anulados.has(m.id as string),
    traspasoId: (m.traspaso_id as string | null) ?? null,
  }));
  const conSaldo = conSaldoAcumulado(base).map((m) => ({
    ...m,
    anulable: sePuedeAnularMovimiento({ origenTipo: m.origenTipo, esContramovimiento: m.esContramovimiento, yaAnulado: m.anulado }),
  }));

  const visibles = conSaldo.filter((m) => (!args.desde || m.fecha >= args.desde) && (!args.hasta || m.fecha <= args.hasta));
  const primera = visibles[0];
  const saldoAnterior = primera ? primera.saldo - primera.haber + primera.debe : (conSaldo[conSaldo.length - 1]?.saldo ?? 0);
  return { filas: visibles, saldoFinal: conSaldo[conSaldo.length - 1]?.saldo ?? 0, saldoAnterior };
}

export interface PropietarioOpcion {
  id: string;
  nombre: string;
}

export async function propietariosParaCuenta(): Promise<PropietarioOpcion[]> {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.from("propietario").select("id, nombre_razon_social").is("deleted_at", null).order("nombre_razon_social");
  return (data ?? []).map((p) => ({ id: p.id as string, nombre: p.nombre_razon_social as string }));
}

// Bienes del propietario (para el filtro y para el formulario de movimientos): incluye Gastos varios.
export interface BienDeCuenta {
  id: string;
  nombre: string;
  /** Gastos varios: el bien "general" donde se imputa lo que no es de un bien en particular. */
  esGeneral: boolean;
}

export async function bienesDelPropietario(propietarioId: string): Promise<BienDeCuenta[]> {
  const supabase = await crearClienteServidor();
  const { data: vinculos } = await supabase.from("bien_propietario").select("bien_id").eq("propietario_id", propietarioId).is("deleted_at", null);
  const ids = (vinculos ?? []).map((v) => v.bien_id as string);
  if (ids.length === 0) return [];
  const { data } = await supabase.from("bien").select("id, alias, es_gastos_varios").in("id", ids).is("deleted_at", null).order("alias");
  return (data ?? []).map((b) => ({ id: b.id as string, nombre: b.alias as string, esGeneral: Boolean(b.es_gastos_varios) }));
}

// PRO-07: la cuenta en dólares se habilita sola cuando hay movimientos u obligaciones en dólares.
export async function tieneCuentaEnDolares(propietarioId: string): Promise<boolean> {
  const supabase = await crearClienteServidor();
  const { count: movimientos } = await supabase
    .from("movimiento")
    .select("id", { count: "exact", head: true })
    .eq("propietario_id", propietarioId)
    .eq("moneda", "USD")
    .is("deleted_at", null);
  if ((movimientos ?? 0) > 0) return true;
  const bienes = await bienesDelPropietario(propietarioId);
  if (bienes.length === 0) return false;
  const { count: obligaciones } = await supabase
    .from("obligacion")
    .select("id", { count: "exact", head: true })
    .in("bien_id", bienes.map((b) => b.id))
    .eq("moneda", "USD")
    .is("deleted_at", null);
  return (obligaciones ?? 0) > 0;
}

export async function saldoDe(propietarioId: string, moneda: Moneda): Promise<number> {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.from("saldo_propietario").select("saldo").eq("propietario_id", propietarioId).eq("moneda", moneda).maybeSingle();
  return Number(data?.saldo ?? 0);
}
