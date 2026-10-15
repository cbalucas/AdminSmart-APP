import { esEmail } from "@ai/domain";
import { SUPABASE_CLAVE, SUPABASE_URL } from "./entorno";
import { supabase } from "./supabase";

export type ResultadoIngreso = "ok" | "credenciales" | "red";

// Ingresa con email o con nombre de usuario. Con usuario, la función del servidor busca el email y
// devuelve la sesión; la app nunca ve el email de la cuenta.
export async function ingresarConIdentificador(identificador: string, contrasena: string): Promise<ResultadoIngreso> {
  try {
    if (esEmail(identificador)) {
      const { error } = await supabase.auth.signInWithPassword({ email: identificador, password: contrasena });
      if (!error) return "ok";
      return error.status === 0 || /network|fetch/i.test(error.message) ? "red" : "credenciales";
    }

    const respuesta = await fetch(`${SUPABASE_URL}/functions/v1/ingresar`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_CLAVE },
      body: JSON.stringify({ identificador, contrasena }),
    });
    if (!respuesta.ok) return respuesta.status >= 500 ? "red" : "credenciales";
    const sesion = (await respuesta.json()) as { access_token: string; refresh_token: string };
    const { error } = await supabase.auth.setSession(sesion);
    return error ? "credenciales" : "ok";
  } catch {
    return "red";
  }
}
