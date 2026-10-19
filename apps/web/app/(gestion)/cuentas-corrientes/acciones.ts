"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { formatearImporte, generarUuidV7, transferenciaExcedeSaldo, type Moneda } from "@ai/domain";
import { saldoDe } from "@/lib/cuentas-corrientes";
import { leerAdjuntos, registrarDocumentos } from "@/lib/documentos";
import { leerMovimiento, leerTraspaso, type EstadoFormularioMovimiento } from "@/lib/formulario-movimiento";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { usuarioActual } from "@/lib/usuario-actual";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const volver = (propietarioId: string, moneda: string) => `/cuentas-corrientes?propietario=${propietarioId}&moneda=${moneda}`;

// El bien del movimiento tiene que ser del propietario.
async function esBienDelPropietario(bienId: string, propietarioId: string): Promise<boolean> {
  const supabase = await crearClienteServidor();
  const { data } = await supabase
    .from("bien_propietario")
    .select("id")
    .eq("bien_id", bienId)
    .eq("propietario_id", propietarioId)
    .is("deleted_at", null)
    .limit(1);
  return Boolean(data?.length);
}

// P-33 Movimiento manual (solo administrador, MOV-03).
export async function crearMovimientoManual(movimientoId: string, _a: EstadoFormularioMovimiento, formulario: FormData): Promise<EstadoFormularioMovimiento> {
  const { usuario } = await usuarioActual();
  if (!usuario) return { error: "cuentas.error_guardar" };
  if (!usuario.roles.includes("administrador")) return { error: "cuentas.solo_administrador" };
  const leido = leerMovimiento(formulario);
  if (!leido.ok) return { errores: leido.errores };
  const d = leido.datos;
  if (!(await esBienDelPropietario(d.bienId, d.propietarioId))) return { errores: { bienId: "cuentas.bien_ajeno" } };

  // MOV-05: una transferencia no puede superar el saldo disponible, salvo confirmación expresa.
  if (d.tipo === "transferencia_propietario" && !d.confirmarExceso) {
    const saldo = await saldoDe(d.propietarioId, d.moneda as Moneda);
    if (transferenciaExcedeSaldo(saldo, d.importe)) return { avisoExceso: formatearImporte(saldo, d.moneda as Moneda) };
  }

  const supabase = await crearClienteServidor();
  const id = UUID.test(movimientoId) ? movimientoId : generarUuidV7();
  const { error } = await supabase.from("movimiento").insert({
    id,
    organizacion_id: usuario.organizacionId,
    propietario_id: d.propietarioId,
    bien_id: d.bienId,
    moneda: d.moneda,
    fecha: d.fecha,
    tipo: d.tipo,
    debe: d.lado === "debe" ? d.importe : 0,
    haber: d.lado === "haber" ? d.importe : 0,
    descripcion: d.descripcion,
    origen_tipo: "manual",
  });
  if (error) return { error: "cuentas.error_guardar" };

  await registrarDocumentos(usuario.organizacionId, "movimiento", id, leerAdjuntos(formulario));
  revalidatePath("/cuentas-corrientes");
  redirect(volver(d.propietarioId, d.moneda));
}

// MOV-04 Traspaso entre pesos y dólares (solo administrador): dos movimientos enlazados.
export async function registrarTraspaso(_a: EstadoFormularioMovimiento, formulario: FormData): Promise<EstadoFormularioMovimiento> {
  const { usuario } = await usuarioActual();
  if (!usuario) return { error: "cuentas.error_guardar" };
  if (!usuario.roles.includes("administrador")) return { error: "cuentas.solo_administrador" };
  const leido = leerTraspaso(formulario);
  if (!leido.ok) return { errores: leido.errores };
  const d = leido.datos;
  if (!(await esBienDelPropietario(d.bienId, d.propietarioId))) return { errores: { bienId: "cuentas.bien_ajeno" } };

  if (!d.confirmarExceso) {
    const saldo = await saldoDe(d.propietarioId, d.monedaOrigen as Moneda);
    if (transferenciaExcedeSaldo(saldo, d.importeOrigen)) return { avisoExceso: formatearImporte(saldo, d.monedaOrigen as Moneda) };
  }

  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("registrar_traspaso", {
    p_organizacion: usuario.organizacionId,
    p_propietario: d.propietarioId,
    p_bien: d.bienId,
    p_moneda_origen: d.monedaOrigen,
    p_importe_origen: d.importeOrigen,
    p_importe_destino: d.importeDestino,
    p_fecha: d.fecha,
    p_descripcion: d.descripcion,
    p_tipo_cambio: d.tipoCambio,
  });
  if (error) return { error: "cuentas.error_guardar" };

  revalidatePath("/cuentas-corrientes");
  redirect(volver(d.propietarioId, d.monedaOrigen));
}

export interface EstadoAnulacionMovimiento {
  error?: string;
}

// RN-05, MOV-03 Anular un movimiento manual: contramovimiento que lo invierte (los dos si es un traspaso).
export async function anularMovimiento(
  movimientoId: string,
  propietarioId: string,
  moneda: string,
  _a: EstadoAnulacionMovimiento,
): Promise<EstadoAnulacionMovimiento> {
  const { usuario } = await usuarioActual();
  if (!usuario || !UUID.test(movimientoId)) return { error: "cuentas.error_anular" };
  if (!usuario.roles.includes("administrador")) return { error: "cuentas.solo_administrador" };
  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("anular_movimiento", { p_movimiento: movimientoId });
  if (error) return { error: error.message.includes("MOV-06") ? "cuentas.periodo_liquidado" : "cuentas.error_anular" };
  revalidatePath("/cuentas-corrientes");
  redirect(volver(propietarioId, moneda));
}
