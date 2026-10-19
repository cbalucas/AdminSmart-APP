"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { esquemaCuentaBancaria, generarUuidV7 } from "@ai/domain";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { usuarioActual } from "@/lib/usuario-actual";

export interface EstadoCuenta {
  errores?: Record<string, string>;
  error?: string;
}
export interface ResultadoCuenta {
  error?: string;
}

const texto = (f: FormData, nombre: string) => String(f.get(nombre) ?? "");

// Solo el administrador gestiona las cuentas bancarias (P-14).
async function esAdministrador(): Promise<boolean> {
  const { usuario } = await usuarioActual();
  return Boolean(usuario?.roles.includes("administrador"));
}

function leer(formulario: FormData) {
  const r = esquemaCuentaBancaria.safeParse({
    banco: texto(formulario, "banco"),
    tipoCuenta: texto(formulario, "tipoCuenta"),
    moneda: texto(formulario, "moneda") || undefined,
    cbuCvu: texto(formulario, "cbuCvu"),
    alias: texto(formulario, "alias"),
    titular: texto(formulario, "titular"),
  });
  if (r.success) return { ok: true as const, datos: r.data };
  const errores: Record<string, string> = {};
  for (const issue of r.error.issues) {
    const campo = String(issue.path[0] ?? "general");
    errores[campo] ??= issue.message.startsWith("validacion.") ? issue.message : "cuentas.error_guardar";
  }
  return { ok: false as const, errores };
}

const refrescar = (propietarioId: string) => {
  revalidatePath(`/propietarios/${propietarioId}`);
  revalidatePath("/propietarios");
};

// Crea el vínculo propietario-cuenta; si ya existió y se quitó, lo reactiva. La primera cuenta
// de cada moneda queda como predeterminada (PRO-05).
async function vincular(propietarioId: string, cuentaId: string, moneda: string, organizacionId: string) {
  const supabase = await crearClienteServidor();
  const { data: previos } = await supabase
    .from("propietario_cuenta")
    .select("id, cuenta_bancaria_id, predeterminada")
    .eq("propietario_id", propietarioId)
    .is("deleted_at", null);
  const idsPrevios = (previos ?? []).map((v) => v.cuenta_bancaria_id as string);
  const { data: monedas } = idsPrevios.length
    ? await supabase.from("cuenta_bancaria").select("id, moneda").in("id", idsPrevios)
    : { data: [] as { id: string; moneda: string }[] };
  const hayPredeterminada = (previos ?? []).some(
    (v) => v.predeterminada && monedas?.find((m) => m.id === v.cuenta_bancaria_id)?.moneda === moneda,
  );
  const predeterminada = !hayPredeterminada;

  const { data: antiguo } = await supabase
    .from("propietario_cuenta")
    .select("id")
    .eq("propietario_id", propietarioId)
    .eq("cuenta_bancaria_id", cuentaId)
    .maybeSingle();
  if (antiguo) {
    return supabase.from("propietario_cuenta").update({ deleted_at: null, predeterminada }).eq("id", antiguo.id);
  }
  return supabase.from("propietario_cuenta").insert({
    id: generarUuidV7(),
    organizacion_id: organizacionId,
    propietario_id: propietarioId,
    cuenta_bancaria_id: cuentaId,
    predeterminada,
  });
}

export async function crearCuenta(propietarioId: string, _a: EstadoCuenta, formulario: FormData): Promise<EstadoCuenta> {
  const { usuario } = await usuarioActual();
  if (!usuario || !(await esAdministrador())) return { error: "cuentas.sin_permiso" };

  const leido = leer(formulario);
  if (!leido.ok) return { errores: leido.errores };

  const supabase = await crearClienteServidor();
  const { data: igual } = await supabase.from("cuenta_bancaria").select("id").eq("cbu_cvu", leido.datos.cbuCvu).is("deleted_at", null).maybeSingle();
  if (igual) return { errores: { cbuCvu: "cuentas.ya_existe" } };

  const id = generarUuidV7();
  const { error } = await supabase.from("cuenta_bancaria").insert({
    id,
    organizacion_id: usuario.organizacionId,
    banco: leido.datos.banco,
    tipo_cuenta: leido.datos.tipoCuenta,
    moneda: leido.datos.moneda,
    cbu_cvu: leido.datos.cbuCvu,
    alias: leido.datos.alias,
    titular: leido.datos.titular,
  });
  if (error) return { error: "cuentas.error_guardar" };

  const { error: errorVinculo } = await vincular(propietarioId, id, leido.datos.moneda, usuario.organizacionId);
  if (errorVinculo) return { error: "cuentas.error_guardar" };

  refrescar(propietarioId);
  redirect(`/propietarios/${propietarioId}`);
}

export async function actualizarCuenta(
  propietarioId: string,
  cuentaId: string,
  _a: EstadoCuenta,
  formulario: FormData,
): Promise<EstadoCuenta> {
  if (!(await esAdministrador())) return { error: "cuentas.sin_permiso" };
  const leido = leer(formulario);
  if (!leido.ok) return { errores: leido.errores };

  const supabase = await crearClienteServidor();
  const { data: igual } = await supabase
    .from("cuenta_bancaria")
    .select("id")
    .eq("cbu_cvu", leido.datos.cbuCvu)
    .neq("id", cuentaId)
    .is("deleted_at", null)
    .maybeSingle();
  if (igual) return { errores: { cbuCvu: "cuentas.ya_existe" } };

  const { error } = await supabase
    .from("cuenta_bancaria")
    .update({
      banco: leido.datos.banco,
      tipo_cuenta: leido.datos.tipoCuenta,
      moneda: leido.datos.moneda,
      cbu_cvu: leido.datos.cbuCvu,
      alias: leido.datos.alias,
      titular: leido.datos.titular,
    })
    .eq("id", cuentaId);
  if (error) return { error: "cuentas.error_guardar" };

  refrescar(propietarioId);
  redirect(`/propietarios/${propietarioId}`);
}

export async function vincularCuentaExistente(propietarioId: string, cuentaId: string): Promise<ResultadoCuenta> {
  const { usuario } = await usuarioActual();
  if (!usuario || !(await esAdministrador())) return { error: "cuentas.sin_permiso" };
  const supabase = await crearClienteServidor();
  const { data: cuenta } = await supabase.from("cuenta_bancaria").select("moneda").eq("id", cuentaId).maybeSingle();
  if (!cuenta) return { error: "cuentas.error_accion" };
  const { error } = await vincular(propietarioId, cuentaId, cuenta.moneda as string, usuario.organizacionId);
  if (error) return { error: "cuentas.error_accion" };
  refrescar(propietarioId);
  return {};
}

// PRO-05: una sola predeterminada por propietario y moneda. Se quita la anterior y se marca la nueva.
export async function marcarPredeterminada(propietarioId: string, vinculoId: string): Promise<ResultadoCuenta> {
  if (!(await esAdministrador())) return { error: "cuentas.sin_permiso" };
  const supabase = await crearClienteServidor();

  const { data: vinculo } = await supabase.from("propietario_cuenta").select("cuenta_bancaria_id").eq("id", vinculoId).maybeSingle();
  if (!vinculo) return { error: "cuentas.error_accion" };
  const { data: cuenta } = await supabase.from("cuenta_bancaria").select("moneda, estado").eq("id", vinculo.cuenta_bancaria_id).maybeSingle();
  if (!cuenta || cuenta.estado !== "activo") return { error: "cuentas.error_accion" };

  const { data: delPropietario } = await supabase.from("propietario_cuenta").select("id, cuenta_bancaria_id").eq("propietario_id", propietarioId).eq("predeterminada", true).is("deleted_at", null);
  const idsCuentas = (delPropietario ?? []).map((v) => v.cuenta_bancaria_id as string);
  const { data: monedas } = idsCuentas.length
    ? await supabase.from("cuenta_bancaria").select("id, moneda").in("id", idsCuentas)
    : { data: [] as { id: string; moneda: string }[] };
  const aQuitar = (delPropietario ?? [])
    .filter((v) => monedas?.find((m) => m.id === v.cuenta_bancaria_id)?.moneda === cuenta.moneda)
    .map((v) => v.id as string);
  if (aQuitar.length) {
    const { error } = await supabase.from("propietario_cuenta").update({ predeterminada: false }).in("id", aQuitar);
    if (error) return { error: "cuentas.error_accion" };
  }
  const { error } = await supabase.from("propietario_cuenta").update({ predeterminada: true }).eq("id", vinculoId);
  if (error) return { error: "cuentas.error_accion" };

  refrescar(propietarioId);
  return {};
}

// Quitar la cuenta de este propietario (no borra la cuenta: otros cotitulares pueden seguir usándola).
export async function desvincularCuenta(propietarioId: string, vinculoId: string): Promise<ResultadoCuenta> {
  if (!(await esAdministrador())) return { error: "cuentas.sin_permiso" };
  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from("propietario_cuenta")
    .update({ deleted_at: new Date().toISOString(), predeterminada: false })
    .eq("id", vinculoId);
  if (error) return { error: "cuentas.error_accion" };
  refrescar(propietarioId);
  return {};
}

// PRO-06: una cuenta compartida no se elimina; se desactiva. Una cuenta inactiva deja de ser predeterminada.
export async function cambiarEstadoCuenta(propietarioId: string, cuentaId: string, activa: boolean): Promise<ResultadoCuenta> {
  if (!(await esAdministrador())) return { error: "cuentas.sin_permiso" };
  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("cuenta_bancaria").update({ estado: activa ? "activo" : "inactivo" }).eq("id", cuentaId);
  if (error) return { error: "cuentas.error_accion" };
  if (!activa) {
    await supabase.from("propietario_cuenta").update({ predeterminada: false }).eq("cuenta_bancaria_id", cuentaId);
  }
  refrescar(propietarioId);
  return {};
}
