// Ingreso con nombre de usuario (P-02): la app envía el usuario y la contraseña; esta función busca
// el email de esa cuenta y hace el ingreso en el servidor. La app recibe solo la sesión, nunca el
// email, para que nadie pueda averiguar el email de un usuario probando nombres.
//
//   POST { identificador, contrasena } → { access_token, refresh_token }
//
// Si el nombre no existe, la cuenta está inactiva o la contraseña es incorrecta, responde siempre lo
// mismo (`credenciales_invalidas`) para no revelar cuál fue la causa.
import { createClient } from "npm:@supabase/supabase-js@2";

const cabeceras = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const responder = (cuerpo: unknown, estado = 200) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { ...cabeceras, "Content-Type": "application/json" },
  });

const PATRON_NOMBRE_USUARIO = /^[a-z0-9._-]{3,30}$/; // igual que packages/domain/src/autenticacion.ts

Deno.serve(async (peticion) => {
  if (peticion.method === "OPTIONS") return new Response(null, { status: 204, headers: cabeceras });
  if (peticion.method !== "POST") return responder({ error: "metodo_no_permitido" }, 405);

  let cuerpo: Record<string, unknown>;
  try {
    cuerpo = await peticion.json();
  } catch {
    return responder({ error: "datos_invalidos" }, 400);
  }
  const identificador = typeof cuerpo.identificador === "string" ? cuerpo.identificador.trim().toLowerCase() : "";
  const contrasena = typeof cuerpo.contrasena === "string" ? cuerpo.contrasena : "";
  if (!identificador || !contrasena) return responder({ error: "datos_invalidos" }, 400);

  const url = Deno.env.get("SUPABASE_URL")!;
  const servidor = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Un nombre con arroba no es un nombre de usuario: el ingreso por email no pasa por acá.
  let email: string | null = null;
  if (PATRON_NOMBRE_USUARIO.test(identificador)) {
    const { data } = await servidor
      .from("usuario")
      .select("email")
      .eq("nombre_usuario", identificador)
      .eq("estado", "activo")
      .is("deleted_at", null)
      .maybeSingle();
    email = data?.email ?? null;
  }
  if (!email) return responder({ error: "credenciales_invalidas" }, 401);

  // El ingreso lo hace Supabase Auth con la clave pública, como si fuera la app.
  const clavePublica = peticion.headers.get("apikey") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
  const publico = createClient(url, clavePublica, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: sesion, error } = await publico.auth.signInWithPassword({ email, password: contrasena });
  if (error || !sesion.session) return responder({ error: "credenciales_invalidas" }, 401);

  return responder({
    access_token: sesion.session.access_token,
    refresh_token: sesion.session.refresh_token,
  });
});
