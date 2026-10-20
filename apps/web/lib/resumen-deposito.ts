import {
  armarResumenDeposito,
  completarPlantilla,
  fechaLimiteDelHorizonte,
  formatearImporte,
  imputacionDelBien,
  parteDelPropietario,
  type Horizonte,
  type ModoLiquidacion,
  type Moneda,
  type ObligacionParaResumen,
  type ResumenDeposito,
} from "@ai/domain";
import { t } from "@ai/i18n";
import { plantillaVigente } from "@/lib/plantillas";
import { titularesDe } from "@/lib/bienes";
import { fechaHoy, listarObligaciones, type FilaObligacion } from "@/lib/obligaciones";
import { obtenerPropietario } from "@/lib/propietarios";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export interface DatosDeposito {
  administracion: string;
  banco: string | null;
  titular: string | null;
  cbu: string | null;
  alias: string | null;
  /** Ruta del logo en el almacén privado (para el PDF). */
  logoPath: string | null;
}

export interface ResumenDelPropietario {
  propietarioId: string;
  nombre: string;
  telefono: string | null;
  telefonos: { tipo: string; numero: string }[];
  emailPrincipal: string | null;
  hoy: string;
  horizonte: Horizonte;
  fechaLimite: string;
  /** Un resumen por moneda con datos (ARS siempre; USD si hay obligaciones o movimientos en dólares). */
  resumenes: ResumenDeposito[];
  deposito: DatosDeposito;
}

const MONEDAS: Moneda[] = ["ARS", "USD"];

export interface BienParaResumen {
  alias: string;
  esGastosVarios: boolean;
  modo: ModoLiquidacion;
  propietarioLiquidacionId: string | null;
}

/**
 * Obligaciones a cargo del propietario, con su parte de cada una según el modo de liquidación del bien (CON-02, CON-04).
 * Las de bienes que no son suyos, o cuya parte no le corresponde, no entran.
 */
export function obligacionesParaResumen(args: {
  propietarioId: string;
  obligaciones: readonly FilaObligacion[];
  bienes: ReadonlyMap<string, BienParaResumen>;
  titulares: ReadonlyMap<string, readonly { propietarioId: string; porcentaje: number; esRepresentante: boolean }[]>;
}): ObligacionParaResumen[] {
  const lista: ObligacionParaResumen[] = [];
  for (const o of args.obligaciones) {
    const bien = args.bienes.get(o.bienId);
    if (!bien || o.responsable !== "propietario") continue;
    const imputacion = imputacionDelBien(bien.modo, (args.titulares.get(o.bienId) ?? []).map((x) => ({ propietarioId: x.propietarioId, porcentaje: x.porcentaje, esRepresentante: x.esRepresentante })), bien.propietarioLiquidacionId);
    const suParte = imputacion.find((x) => x.propietarioId === args.propietarioId);
    if (!suParte) continue;
    lista.push({
      id: o.id,
      bien: bien.esGastosVarios ? t("bienes.gastos_varios") : bien.alias,
      concepto: o.concepto,
      descripcion: o.descripcion,
      periodo: o.periodo,
      vencimiento: o.vencimiento,
      monto: o.monto === null ? null : parteDelPropietario(o.monto, imputacion, args.propietarioId),
      moneda: o.moneda,
      estado: o.estado,
      porcentaje: suParte.porcentaje,
    });
  }
  return lista;
}

/** Horizonte desde los parámetros de la dirección: días del propietario (por defecto), fin de mes o fecha a elección. */
export function leerHorizonte(h: string | undefined, fecha: string | undefined, diasDelPropietario: number): Horizonte {
  if (h === "fin_de_mes") return { tipo: "fin_de_mes" };
  if (h === "fecha" && fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { tipo: "fecha", fecha };
  return { tipo: "dias", dias: diasDelPropietario };
}

// RN-02, RN-15, sección 4.5: obligaciones a cargo del propietario (su parte según el modo de liquidación de cada bien),
// su saldo y el fondo de reserva, por moneda.
export async function calcularResumenDelPropietario(propietarioId: string, horizonte?: Horizonte): Promise<ResumenDelPropietario | null> {
  const propietario = await obtenerPropietario(propietarioId);
  if (!propietario) return null;
  const hoy = fechaHoy();
  const h: Horizonte = horizonte ?? { tipo: "dias", dias: propietario.horizonteResumenDias };
  const fechaLimite = fechaLimiteDelHorizonte(h, hoy);

  const supabase = await crearClienteServidor();
  const { data: vinculos } = await supabase.from("bien_propietario").select("bien_id").eq("propietario_id", propietarioId).is("deleted_at", null);
  const bienIds = [...new Set((vinculos ?? []).map((v) => v.bien_id as string))];

  const [{ data: bienes }, titulares, todas, { data: saldos }, { data: org }] = await Promise.all([
    bienIds.length
      ? supabase.from("bien").select("id, alias, es_gastos_varios, modo_liquidacion, propietario_liquidacion_id").in("id", bienIds).is("deleted_at", null)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    titularesDe(bienIds),
    listarObligaciones(),
    supabase.from("saldo_propietario").select("moneda, saldo").eq("propietario_id", propietarioId),
    supabase.from("organizacion").select("nombre, logo_path, cuenta_deposito_banco, cuenta_deposito_titular, cuenta_deposito_cbu, cuenta_deposito_alias").limit(1).maybeSingle(),
  ]);

  const paraResumen = obligacionesParaResumen({
    propietarioId,
    obligaciones: todas,
    bienes: new Map(
      (bienes ?? []).map((b) => [
        b.id as string,
        { alias: b.alias as string, esGastosVarios: Boolean(b.es_gastos_varios), modo: b.modo_liquidacion as ModoLiquidacion, propietarioLiquidacionId: (b.propietario_liquidacion_id as string | null) ?? null },
      ]),
    ),
    titulares,
  });

  const saldoDe = (m: Moneda) => Number(saldos?.find((s) => s.moneda === m)?.saldo ?? 0);
  const hayDolares = paraResumen.some((o) => o.moneda === "USD") || saldos?.some((s) => s.moneda === "USD");
  const resumenes = MONEDAS.filter((m) => m === "ARS" || hayDolares).map((m) =>
    armarResumenDeposito({
      obligaciones: paraResumen,
      moneda: m,
      saldoDisponible: saldoDe(m),
      fondoReserva: m === "ARS" ? propietario.fondoReservaArs : propietario.fondoReservaUsd,
      fechaLimite,
      hoy,
    }),
  );

  return {
    propietarioId,
    nombre: propietario.nombre,
    telefono: propietario.telefonos[0]?.numero ?? null,
    telefonos: propietario.telefonos,
    emailPrincipal: (propietario.emails.find((e) => e.principal) ?? propietario.emails[0])?.email ?? null,
    hoy,
    horizonte: h,
    fechaLimite,
    resumenes,
    deposito: {
      administracion: (org?.nombre as string | undefined) ?? "",
      banco: (org?.cuenta_deposito_banco as string | null | undefined) ?? null,
      titular: (org?.cuenta_deposito_titular as string | null | undefined) ?? null,
      cbu: (org?.cuenta_deposito_cbu as string | null | undefined) ?? null,
      alias: (org?.cuenta_deposito_alias as string | null | undefined) ?? null,
      logoPath: (org?.logo_path as string | null | undefined) ?? null,
    },
  };
}

const fechaCorta = (f: string) => f.split("-").reverse().join("/");

/** Banco, titular, CBU y alias de la administración, solo con lo que está cargado. */
export function textoDatosDeposito(d: DatosDeposito): string {
  return [
    d.banco ? `${t("resumen.banco")} ${d.banco}` : null,
    d.titular ? `${t("resumen.titular")} ${d.titular}` : null,
    d.cbu ? `${t("resumen.cbu")} ${d.cbu}` : null,
    d.alias ? `${t("resumen.alias")} ${d.alias}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * Texto del mensaje de WhatsApp del resumen, con la plantilla vigente (la del administrador o la de fábrica).
 * El número DEP-AAAA-NNNN todavía no existe: queda como {numero} y se completa cuando se genera el PDF.
 */
export async function mensajeWhatsApp(r: ResumenDelPropietario): Promise<string> {
  const aDepositar = r.resumenes.filter((x) => x.aDepositar > 0);
  const limite = fechaCorta(r.fechaLimite);
  if (aDepositar.length === 0) return t("resumen.wa_sin_deposito", { nombre: r.nombre, fecha_limite: limite, administracion: r.deposito.administracion });
  const plantilla = await plantillaVigente("resumen_deposito", "whatsapp");
  return completarPlantilla(plantilla.cuerpo, {
    nombre: r.nombre,
    administracion: r.deposito.administracion,
    monto: aDepositar.map((x) => formatearImporte(x.aDepositar, x.moneda)).join(" y "),
    fecha_limite: limite,
    datos_deposito: textoDatosDeposito(r.deposito),
  });
}

export interface FilaHistorial {
  id: string;
  numero: string;
  fecha: string;
  horizonteDias: number;
  fechaLimite: string;
  tienePdf: boolean;
  montos: { moneda: Moneda; aDepositar: number }[];
}

// LIQ-08: historial de resúmenes generados de un propietario, del más nuevo al más viejo.
export async function historialDeResumenes(propietarioId: string): Promise<FilaHistorial[]> {
  const supabase = await crearClienteServidor();
  const { data } = await supabase
    .from("resumen_deposito")
    .select("id, numero, fecha, horizonte_dias, fecha_limite, pdf_path, created_at")
    .eq("propietario_id", propietarioId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  const filas = data ?? [];
  const { data: montos } = filas.length
    ? await supabase.from("resumen_deposito_monto").select("resumen_deposito_id, moneda, a_depositar").in("resumen_deposito_id", filas.map((f) => f.id as string)).is("deleted_at", null)
    : { data: [] as Record<string, unknown>[] };
  return filas.map((f) => ({
    id: f.id as string,
    numero: f.numero as string,
    fecha: f.fecha as string,
    horizonteDias: Number(f.horizonte_dias),
    fechaLimite: f.fecha_limite as string,
    tienePdf: Boolean(f.pdf_path),
    montos: (montos ?? [])
      .filter((m) => m.resumen_deposito_id === f.id)
      .map((m) => ({ moneda: m.moneda as Moneda, aDepositar: Number(m.a_depositar) }))
      .sort((a, b) => a.moneda.localeCompare(b.moneda)),
  }));
}

export interface UltimoEnvio {
  fecha: string;
  canal: string;
  estado: string;
  numero: string;
}

// Último envío de un resumen de este propietario (LIQ-07: fecha, canal y estado).
export async function ultimoEnvioDeResumen(historial: FilaHistorial[]): Promise<UltimoEnvio | null> {
  if (historial.length === 0) return null;
  const supabase = await crearClienteServidor();
  const { data } = await supabase
    .from("envio")
    .select("documento_id, canal, estado, fecha")
    .eq("documento_tipo", "resumen_deposito")
    .in("documento_id", historial.map((h) => h.id))
    .order("fecha", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return {
    fecha: data.fecha as string,
    canal: data.canal as string,
    estado: data.estado as string,
    numero: historial.find((h) => h.id === data.documento_id)?.numero ?? "",
  };
}
