import { cache } from "react";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export interface Administracion {
  id: string;
  nombre: string;
  cuit: string | null;
  contactoTelefono: string | null;
  contactoEmail: string | null;
  contactoDireccion: string | null;
  cuentaDepositoBanco: string | null;
  cuentaDepositoTitular: string | null;
  cuentaDepositoCbu: string | null;
  cuentaDepositoAlias: string | null;
  emailEnvio: string | null;
  logoPath: string | null;
  diasAvisoRecurrentes: number;
  monedaDefecto: "ARS" | "USD";
}

// ADM-01: existe una sola administración; la base devuelve la de quien ingresó.
export const obtenerAdministracion = cache(async (): Promise<Administracion | null> => {
  const supabase = await crearClienteServidor();
  const { data: o } = await supabase.from("organizacion").select("*").limit(1).maybeSingle();
  if (!o) return null;
  const texto = (v: unknown) => (typeof v === "string" && v !== "" ? v : null);
  return {
    id: o.id as string,
    nombre: o.nombre as string,
    cuit: texto(o.cuit),
    contactoTelefono: texto(o.contacto_telefono),
    contactoEmail: texto(o.contacto_email),
    contactoDireccion: texto(o.contacto_direccion),
    cuentaDepositoBanco: texto(o.cuenta_deposito_banco),
    cuentaDepositoTitular: texto(o.cuenta_deposito_titular),
    cuentaDepositoCbu: texto(o.cuenta_deposito_cbu),
    cuentaDepositoAlias: texto(o.cuenta_deposito_alias),
    emailEnvio: texto(o.email_envio),
    logoPath: texto(o.logo_path),
    diasAvisoRecurrentes: Number(o.dias_aviso_recurrentes ?? 5),
    monedaDefecto: o.moneda_defecto === "USD" ? "USD" : "ARS",
  };
});

/** Enlace temporal del logo guardado en el almacén privado (una hora). */
export async function enlaceDelLogo(ruta: string | null): Promise<string | null> {
  if (!ruta) return null;
  const supabase = await crearClienteServidor();
  const { data } = await supabase.storage.from("marca").createSignedUrl(ruta, 60 * 60);
  return data?.signedUrl ?? null;
}

/** Bytes del logo para dibujarlo en un PDF. */
export async function descargarLogo(ruta: string): Promise<Buffer | null> {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.storage.from("marca").download(ruta);
  return data ? Buffer.from(await data.arrayBuffer()) : null;
}
