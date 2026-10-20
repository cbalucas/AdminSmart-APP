import {
  armarResumenDeposito,
  fechaLimiteDelHorizonte,
  type ModoLiquidacion,
  type Moneda,
} from "@ai/domain";
import { fechaHoy, listarObligaciones, type FilaObligacion } from "@/lib/obligaciones";
import { obligacionesParaResumen } from "@/lib/resumen-deposito";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export interface Total {
  cantidad: number;
  /** Suma por moneda, en centavos. */
  montos: Record<Moneda, number>;
}

export interface FilaADepositar {
  propietarioId: string;
  nombre: string;
  ars: number;
  usd: number;
}

export interface DatosHomeGestion {
  hoy: string;
  vencidas: Total;
  vencen7: Total;
  vencen30: Total;
  aCompletar: number;
  saldoTotal: Record<Moneda, number>;
  aDepositar: FilaADepositar[];
  proximos: FilaObligacion[];
  /** Nombre del bien de cada obligación, para listarlas. */
  nombreBien: Record<string, string>;
}

const sumar = (lista: readonly FilaObligacion[]): Total => {
  const montos: Record<Moneda, number> = { ARS: 0, USD: 0 };
  for (const o of lista) if (o.monto !== null) montos[o.moneda] += o.monto;
  return { cantidad: lista.length, montos };
};

const sumarDias = (fecha: string, dias: number) => new Date(Date.parse(`${fecha}T00:00:00Z`) + dias * 86_400_000).toISOString().slice(0, 10);

// P-07 Home de gestión: indicadores del día. La base ya limita todo a lo que el usuario puede ver (RLS):
// un operador ve solo lo de sus bienes.
export async function datosHomeGestion(): Promise<DatosHomeGestion> {
  const hoy = fechaHoy();
  const supabase = await crearClienteServidor();
  const [todas, { data: propietarios }, { data: vinculos }, { data: bienes }, { data: saldos }] = await Promise.all([
    listarObligaciones(),
    supabase.from("propietario").select("id, nombre_razon_social, horizonte_resumen_dias, fondo_reserva_ars, fondo_reserva_usd").is("deleted_at", null).order("nombre_razon_social"),
    supabase.from("bien_propietario").select("bien_id, propietario_id, porcentaje, es_representante").is("deleted_at", null),
    supabase.from("bien").select("id, alias, es_gastos_varios, modo_liquidacion, propietario_liquidacion_id").is("deleted_at", null),
    supabase.from("saldo_propietario").select("propietario_id, moneda, saldo"),
  ]);

  const vivas = todas.filter((o) => o.estado === "pendiente" || o.estado === "vencida");
  const vencidas = todas.filter((o) => o.estado === "vencida");
  const entre = (dias: number) => vivas.filter((o) => o.estado === "pendiente" && o.vencimiento !== null && o.vencimiento >= hoy && o.vencimiento <= sumarDias(hoy, dias));

  const saldoTotal: Record<Moneda, number> = { ARS: 0, USD: 0 };
  for (const s of saldos ?? []) saldoTotal[s.moneda as Moneda] += Number(s.saldo);

  const titulares = new Map<string, { propietarioId: string; porcentaje: number; esRepresentante: boolean }[]>();
  for (const v of vinculos ?? []) {
    const lista = titulares.get(v.bien_id as string) ?? [];
    lista.push({ propietarioId: v.propietario_id as string, porcentaje: Number(v.porcentaje), esRepresentante: Boolean(v.es_representante) });
    titulares.set(v.bien_id as string, lista);
  }
  const bienDe = new Map(
    (bienes ?? []).map((b) => [
      b.id as string,
      { alias: b.alias as string, esGastosVarios: Boolean(b.es_gastos_varios), modo: b.modo_liquidacion as ModoLiquidacion, propietarioLiquidacionId: (b.propietario_liquidacion_id as string | null) ?? null },
    ]),
  );

  // Monto a depositar de cada propietario con su horizonte (el mismo cálculo del resumen de depósito).
  const aDepositar: FilaADepositar[] = [];
  for (const p of propietarios ?? []) {
    const propietarioId = p.id as string;
    const limite = fechaLimiteDelHorizonte({ tipo: "dias", dias: Number(p.horizonte_resumen_dias) }, hoy);
    const paraResumen = obligacionesParaResumen({ propietarioId, obligaciones: todas, bienes: bienDe, titulares });
    const saldoDe = (m: Moneda) => Number((saldos ?? []).find((s) => s.propietario_id === propietarioId && s.moneda === m)?.saldo ?? 0);
    const calcular = (moneda: Moneda, fondo: unknown) =>
      armarResumenDeposito({ obligaciones: paraResumen, moneda, saldoDisponible: saldoDe(moneda), fondoReserva: fondo === null || fondo === undefined ? null : Number(fondo), fechaLimite: limite, hoy }).aDepositar;
    const ars = calcular("ARS", p.fondo_reserva_ars);
    const usd = calcular("USD", p.fondo_reserva_usd);
    if (ars > 0 || usd > 0) aDepositar.push({ propietarioId, nombre: p.nombre_razon_social as string, ars, usd });
  }
  aDepositar.sort((a, b) => b.ars - a.ars || a.nombre.localeCompare(b.nombre));

  const proximos = vivas
    .filter((o) => o.vencimiento !== null && o.vencimiento >= hoy)
    .sort((a, b) => (a.vencimiento as string).localeCompare(b.vencimiento as string))
    .slice(0, 8);

  return {
    hoy,
    vencidas: sumar(vencidas),
    vencen7: sumar(entre(7)),
    vencen30: sumar(entre(30)),
    aCompletar: todas.filter((o) => o.estado === "a_completar").length,
    saldoTotal,
    aDepositar,
    proximos,
    nombreBien: Object.fromEntries([...bienDe].map(([id, b]) => [id, b.alias])),
  };
}
