// Resumen de depósito (sección 4.5, RN-02, RN-15, OBL-07, OBL-11, PRO-09, MOV-07): cuánto debe depositar
// un propietario para cubrir sus obligaciones hasta una fecha límite. Funciones puras.
import { repartirPorPorcentaje, type Moneda } from "./dinero";
import { estadoObligacion, type EstadoObligacion } from "./obligaciones";

export type Horizonte = { tipo: "dias"; dias: number } | { tipo: "fin_de_mes" } | { tipo: "fecha"; fecha: string };

function sumarDias(fecha: string, dias: number): string {
  const [a, m, d] = fecha.split("-").map(Number);
  const r = new Date(Date.UTC(a as number, (m as number) - 1, (d as number) + dias));
  return r.toISOString().slice(0, 10);
}

/** Fecha límite del horizonte elegido: N días desde hoy, el último día del mes, o una fecha a elección. */
export function fechaLimiteDelHorizonte(h: Horizonte, hoy: string): string {
  if (h.tipo === "dias") return sumarDias(hoy, h.dias);
  if (h.tipo === "fecha") return h.fecha;
  const [a, m] = hoy.split("-").map(Number);
  return new Date(Date.UTC(a as number, m as number, 0)).toISOString().slice(0, 10);
}

/** Parte de una obligación que le corresponde a un propietario según los porcentajes de su bien (CON-02, CON-04). */
export function parteDelPropietario(
  montoCentavos: number,
  imputacion: readonly { propietarioId: string; porcentaje: number }[],
  propietarioId: string,
): number {
  const i = imputacion.findIndex((x) => x.propietarioId === propietarioId);
  if (i < 0 || imputacion.length === 0) return 0;
  return repartirPorPorcentaje(montoCentavos, imputacion.map((x) => x.porcentaje))[i] as number;
}

/**
 * PRO-09: reposición del fondo de reserva. Es lo que falta para que, después de pagar las obligaciones,
 * el saldo quede en el fondo (cero si ya alcanza).
 */
export function reposicionDelFondo(saldoDisponible: number, sumaObligaciones: number, fondoReserva: number | null): number {
  if (!fondoReserva || fondoReserva <= 0) return 0;
  const queda = Math.max(0, saldoDisponible - sumaObligaciones);
  return Math.max(0, fondoReserva - queda);
}

export interface ObligacionParaResumen {
  id: string;
  bien: string;
  concepto: string;
  /** Detalle de un gasto suelto. */
  descripcion: string | null;
  periodo: string;
  vencimiento: string | null;
  /** Parte del propietario, en centavos; null mientras la obligación está A completar. */
  monto: number | null;
  moneda: Moneda;
  estado: EstadoObligacion;
  /** Porcentaje del propietario sobre la obligación (100 si es suya por completo). */
  porcentaje: number;
}

export interface ResumenDeposito {
  moneda: Moneda;
  fechaLimite: string;
  /** Pendientes y vencidas con vencimiento hasta la fecha límite: las que suman. */
  pendientes: ObligacionParaResumen[];
  sumaObligaciones: number;
  saldoDisponible: number;
  reposicionFondo: number;
  aDepositar: number;
  /** Si el saldo cubre todo, lo que sobra (sin tocar el fondo de reserva) se puede transferir al propietario. */
  saldoATransferir: number;
  /** OBL-11: A completar, sin monto: no suman. */
  aConfirmar: ObligacionParaResumen[];
  /** OBL-07: con monto pero sin vencimiento: no suman. */
  posibles: ObligacionParaResumen[];
}

/**
 * Sección 4.5: a depositar = máx(0, obligaciones − saldo) + reposición del fondo. El cálculo es por moneda
 * y nunca compensa pesos con dólares (RN-14). Un saldo deudor aumenta lo que hay que depositar (MOV-07).
 * `hoy` define el estado (vencida o pendiente); las pagadas y anuladas no entran.
 */
export function armarResumenDeposito(args: {
  obligaciones: readonly ObligacionParaResumen[];
  moneda: Moneda;
  saldoDisponible: number;
  fondoReserva: number | null;
  fechaLimite: string;
  hoy: string;
}): ResumenDeposito {
  const { moneda, saldoDisponible, fechaLimite, hoy } = args;
  const vivas = args.obligaciones.filter((o) => o.moneda === moneda).filter((o) => o.estado !== "pagada" && o.estado !== "anulada");
  const estadoDe = (o: ObligacionParaResumen) => estadoObligacion({ monto: o.monto, vencimiento: o.vencimiento, pagada: false, anulada: false }, hoy);

  const pendientes = vivas
    .filter((o) => estadoDe(o) !== "a_completar" && o.vencimiento !== null && o.vencimiento <= fechaLimite)
    .sort((a, b) => (a.vencimiento as string).localeCompare(b.vencimiento as string) || a.bien.localeCompare(b.bien));
  const aConfirmar = vivas.filter((o) => estadoDe(o) === "a_completar").sort((a, b) => a.periodo.localeCompare(b.periodo) || a.bien.localeCompare(b.bien));
  const posibles = vivas.filter((o) => estadoDe(o) !== "a_completar" && o.vencimiento === null).sort((a, b) => a.periodo.localeCompare(b.periodo));

  const suma = pendientes.reduce((s, o) => s + (o.monto as number), 0);
  const reposicion = reposicionDelFondo(saldoDisponible, suma, args.fondoReserva);
  const necesidad = suma - saldoDisponible;
  return {
    moneda,
    fechaLimite,
    pendientes,
    sumaObligaciones: suma,
    saldoDisponible,
    reposicionFondo: reposicion,
    aDepositar: Math.max(0, necesidad) + reposicion,
    saldoATransferir: Math.max(0, -necesidad - (args.fondoReserva ?? 0)),
    aConfirmar,
    posibles,
  };
}
