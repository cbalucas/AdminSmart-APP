"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  dejaSaldoDeudor,
  debitosDelPago,
  esquemaAnulacion,
  exigirConfirmacionDeDiferencia,
  generarUuidV7,
  imputacionDelBien,
  leyendaDeDiferencia,
  validarPago,
  type DebitoDelPago,
  type ModoLiquidacion,
  type Moneda,
  type PagadoPor,
  type Responsable,
} from "@ai/domain";
import { leerAdjuntos, registrarDocumentos } from "@/lib/documentos";
import { leerFormularioPago, leerFormularioPagoDirecto, type EstadoFormularioPago } from "@/lib/formulario-pago";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { usuarioActual } from "@/lib/usuario-actual";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// PAG-04 y MOV-07: débitos que corresponden al pago y propietarios cuya cuenta quedaría con saldo deudor.
async function prepararDebitos(args: {
  bienId: string;
  pagadoPor: PagadoPor;
  responsable: Responsable;
  importe: number;
  moneda: Moneda;
}): Promise<{ debitos: DebitoDelPago[]; deudores: string[] }> {
  const supabase = await crearClienteServidor();
  const [{ data: vinculos }, { data: bien }] = await Promise.all([
    supabase.from("bien_propietario").select("propietario_id, porcentaje, es_representante").eq("bien_id", args.bienId).is("deleted_at", null),
    supabase.from("bien").select("modo_liquidacion, propietario_liquidacion_id").eq("id", args.bienId).maybeSingle(),
  ]);
  // CON-02, CON-04: por separado, cada titular con su porcentaje; al representante o a un propietario elegido, el 100 %.
  const titulares = imputacionDelBien(
    ((bien?.modo_liquidacion as ModoLiquidacion | undefined) ?? "por_separado"),
    (vinculos ?? []).map((v) => ({ propietarioId: v.propietario_id as string, porcentaje: Number(v.porcentaje), esRepresentante: Boolean(v.es_representante) })),
    (bien?.propietario_liquidacion_id as string | null | undefined) ?? null,
  );
  const debitos = debitosDelPago({ pagadoPor: args.pagadoPor, responsable: args.responsable, importe: args.importe, titulares });
  if (debitos.length === 0) return { debitos, deudores: [] };

  const ids = debitos.map((d) => d.propietarioId);
  const [{ data: saldos }, { data: nombres }] = await Promise.all([
    supabase.from("saldo_propietario").select("propietario_id, saldo").in("propietario_id", ids).eq("moneda", args.moneda),
    supabase.from("propietario").select("id, nombre_razon_social").in("id", ids),
  ]);
  const saldoDe = new Map((saldos ?? []).map((s) => [s.propietario_id as string, Number(s.saldo)]));
  const nombreDe = new Map((nombres ?? []).map((p) => [p.id as string, p.nombre_razon_social as string]));
  const deudores = debitos.filter((d) => dejaSaldoDeudor(saldoDe.get(d.propietarioId) ?? 0, d.debe)).map((d) => nombreDe.get(d.propietarioId) ?? "—");
  return { debitos, deudores };
}

const claveError = (mensaje: string | undefined) =>
  mensaje?.includes("PAG-01") || mensaje?.includes("ya tiene un pago") || mensaje?.includes("pago_obligacion_uq") ? "pagos.ya_pagada" : "pagos.error_guardar";

// P-28 Registrar el pago de una obligación (administrador y operador del bien).
export async function registrarPago(obligacionId: string, pagoId: string, _a: EstadoFormularioPago, formulario: FormData): Promise<EstadoFormularioPago> {
  const { usuario } = await usuarioActual();
  if (!usuario || !UUID.test(obligacionId)) return { error: "pagos.error_guardar" };
  const leido = leerFormularioPago(formulario, obligacionId);
  if (!leido.ok) return { errores: leido.errores };
  const d = leido.datos;

  const supabase = await crearClienteServidor();
  const { data: o } = await supabase.from("obligacion").select("*").eq("id", obligacionId).is("deleted_at", null).maybeSingle();
  if (!o) return { error: "pagos.no_encontrada" };

  // PAG-01, PAG-03: misma moneda; si el importe difiere del monto se confirma y se explica.
  const monto = o.monto === null ? null : Number(o.monto);
  const v = validarPago({ montoObligacion: monto, importe: d.importe, monedaObligacion: o.moneda as Moneda, monedaPago: o.moneda as Moneda });
  if (!v.ok) return { error: "pagos.error_guardar" };
  const dif = exigirConfirmacionDeDiferencia(v, { confirmar: d.confirmarDiferencia, motivo: d.motivoDiferencia });
  if (!dif.ok) return { errores: { [dif.error === "validacion.motivo_diferencia" ? "motivoDiferencia" : "importe"]: dif.error } };

  const { debitos, deudores } = await prepararDebitos({
    bienId: o.bien_id as string,
    pagadoPor: d.pagadoPor,
    responsable: o.responsable as Responsable,
    importe: d.importe,
    moneda: o.moneda as Moneda,
  });
  // MOV-07: se avisa y hace falta confirmarlo; la cuenta queda con saldo deudor.
  if (deudores.length > 0 && formulario.get("confirmarSaldo") !== "on") return { avisoSaldo: deudores };

  const observaciones = [monto !== null && monto !== d.importe && d.motivoDiferencia ? leyendaDeDiferencia(monto, d.importe, d.motivoDiferencia) : null, d.observaciones]
    .filter(Boolean)
    .join(" · ");
  const id = UUID.test(pagoId) ? pagoId : generarUuidV7();
  const { error } = await supabase.rpc("registrar_pago", {
    p_obligacion: obligacionId,
    p_fecha: d.fecha,
    p_importe: d.importe,
    p_pagado_por: d.pagadoPor,
    p_medio: d.medio,
    p_nro_operacion: d.nroOperacion,
    p_observaciones: observaciones || null,
    p_debitos: debitos.map((x) => ({ propietario_id: x.propietarioId, debe: x.debe })),
    p_pago_id: id,
  });
  if (error) return { error: claveError(error.message) };

  const adjuntos = await registrarDocumentos(usuario.organizacionId, "pago", id, leerAdjuntos(formulario));
  revalidatePath("/obligaciones");
  redirect(adjuntos.error ? "/obligaciones?aviso=comprobante" : "/obligaciones");
}

// PAG-02 Pago de un gasto sin obligación previa: el sistema crea la obligación ya pagada.
export async function registrarPagoDirecto(pagoId: string, _a: EstadoFormularioPago, formulario: FormData): Promise<EstadoFormularioPago> {
  const { usuario } = await usuarioActual();
  if (!usuario) return { error: "pagos.error_guardar" };
  const leido = leerFormularioPagoDirecto(formulario);
  if (!leido.ok) return { errores: leido.errores };
  const d = leido.datos;

  const { debitos, deudores } = await prepararDebitos({
    bienId: d.bienId,
    pagadoPor: d.pagadoPor,
    responsable: d.responsable,
    importe: d.importe,
    moneda: d.moneda,
  });
  if (deudores.length > 0 && formulario.get("confirmarSaldo") !== "on") return { avisoSaldo: deudores };

  const supabase = await crearClienteServidor();
  const id = UUID.test(pagoId) ? pagoId : generarUuidV7();
  const { error } = await supabase.rpc("registrar_pago_directo", {
    p_organizacion: usuario.organizacionId,
    p_bien: d.bienId,
    p_concepto: d.conceptoId,
    p_responsable: d.responsable,
    p_descripcion: d.descripcion,
    p_moneda: d.moneda,
    p_fecha: d.fecha,
    p_importe: d.importe,
    p_pagado_por: d.pagadoPor,
    p_medio: d.medio,
    p_nro_operacion: d.nroOperacion,
    p_observaciones: d.observaciones,
    p_debitos: debitos.map((x) => ({ propietario_id: x.propietarioId, debe: x.debe })),
    p_pago_id: id,
  });
  if (error) return { error: "pagos.error_guardar" };

  const adjuntos = await registrarDocumentos(usuario.organizacionId, "pago", id, leerAdjuntos(formulario));
  revalidatePath("/obligaciones");
  redirect(adjuntos.error ? "/obligaciones?aviso=comprobante" : "/obligaciones");
}

export interface EstadoAnulacion {
  error?: string;
}

// PAG-05, PAG-06 Anular un pago (solo administrador): motivo obligatorio y contramovimientos.
export async function anularPago(pagoId: string, _a: EstadoAnulacion, formulario: FormData): Promise<EstadoAnulacion> {
  const { usuario } = await usuarioActual();
  if (!usuario || !UUID.test(pagoId)) return { error: "pagos.error_anular" };
  if (!usuario.roles.includes("administrador")) return { error: "pagos.solo_administrador" };
  const r = esquemaAnulacion.safeParse({ motivo: String(formulario.get("motivo") ?? "") });
  if (!r.success) return { error: "validacion.dato_obligatorio" };

  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("anular_pago", { p_pago: pagoId, p_motivo: r.data.motivo });
  if (error) return { error: error.message.includes("PAG-06") || error.message.includes("MOV-06") ? "pagos.periodo_liquidado" : "pagos.error_anular" };

  revalidatePath("/obligaciones");
  redirect("/obligaciones");
}
