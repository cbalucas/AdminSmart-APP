"use server";

import { revalidatePath } from "next/cache";
import { formatoDeLogoGuardado } from "@ai/domain";
import { leerFormularioAdministracion, type EstadoFormularioAdministracion } from "@/lib/formulario-administracion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { usuarioActual } from "@/lib/usuario-actual";

// P-40 Datos de la administración (solo administrador).
export async function guardarAdministracion(_a: EstadoFormularioAdministracion, formulario: FormData): Promise<EstadoFormularioAdministracion> {
  const { usuario } = await usuarioActual();
  if (!usuario?.roles.includes("administrador")) return { error: "administracion.solo_administrador" };
  const leido = leerFormularioAdministracion(formulario);
  if (!leido.ok) return { errores: leido.errores };
  const d = leido.datos;

  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from("organizacion")
    .update({
      nombre: d.nombre,
      cuit: d.cuit,
      contacto_telefono: d.contactoTelefono ?? null,
      contacto_email: d.contactoEmail ?? null,
      contacto_direccion: d.contactoDireccion ?? null,
      cuenta_deposito_banco: d.cuentaDepositoBanco,
      cuenta_deposito_titular: d.cuentaDepositoTitular,
      cuenta_deposito_cbu: d.cuentaDepositoCbu,
      cuenta_deposito_alias: d.cuentaDepositoAlias,
      email_envio: d.emailEnvio,
    })
    .eq("id", usuario.organizacionId);
  if (error) return { error: "administracion.error_guardar" };

  revalidatePath("/configuracion/administracion");
  return { guardado: true };
}

// El logo se sube desde el navegador al almacén privado; acá solo se enlaza (nunca se borra el archivo anterior).
export async function guardarLogo(ruta: string): Promise<{ error?: string }> {
  const { usuario } = await usuarioActual();
  if (!usuario?.roles.includes("administrador")) return { error: "administracion.solo_administrador" };
  if (!ruta.startsWith(`${usuario.organizacionId}/`) || ruta.includes("..") || !formatoDeLogoGuardado(ruta)) return { error: "administracion.error_logo" };
  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("organizacion").update({ logo_path: ruta }).eq("id", usuario.organizacionId);
  if (error) return { error: "administracion.error_logo" };
  revalidatePath("/configuracion/administracion");
  return {};
}

export async function quitarLogo(): Promise<{ error?: string }> {
  const { usuario } = await usuarioActual();
  if (!usuario?.roles.includes("administrador")) return { error: "administracion.solo_administrador" };
  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("organizacion").update({ logo_path: null }).eq("id", usuario.organizacionId);
  if (error) return { error: "administracion.error_logo" };
  revalidatePath("/configuracion/administracion");
  return {};
}
