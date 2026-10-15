import { SUPABASE_CLAVE, SUPABASE_URL } from "./entorno";

const DIRECCION = `${SUPABASE_URL}/functions/v1/configuracion-inicial`;

// ¿Ya se hizo la configuración inicial (P-06)? Si hay un error de conexión devuelve null.
export async function consultarConfiguracion(): Promise<boolean | null> {
  try {
    const respuesta = await fetch(DIRECCION, {
      headers: { apikey: SUPABASE_CLAVE, Authorization: `Bearer ${SUPABASE_CLAVE}` },
      cache: "no-store",
    });
    if (!respuesta.ok) return null;
    const datos = (await respuesta.json()) as { configurada?: boolean };
    return datos.configurada === true;
  } catch {
    return null;
  }
}

export type DatosConfiguracionInicial = {
  codigoInstalacion: string;
  organizacion: {
    nombre: string;
    cuit?: string;
    contactoTelefono?: string;
    contactoEmail?: string;
    contactoDireccion?: string;
  };
  administrador: { nombre: string; email?: string; contrasena?: string };
};

// Devuelve null si salió bien, o el código de error que respondió el servidor.
export async function enviarConfiguracionInicial(
  datos: DatosConfiguracionInicial,
  tokenDeSesion?: string,
): Promise<string | null> {
  try {
    const respuesta = await fetch(DIRECCION, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_CLAVE,
        Authorization: `Bearer ${tokenDeSesion ?? SUPABASE_CLAVE}`,
      },
      body: JSON.stringify(datos),
    });
    if (respuesta.ok) return null;
    const cuerpo = (await respuesta.json().catch(() => ({}))) as { error?: string };
    return cuerpo.error ?? "error_interno";
  } catch {
    return "sin_conexion";
  }
}
