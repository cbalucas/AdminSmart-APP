// Configuración inicial (P-06): crea la administración, su primer administrador y el catálogo
// inicial de conceptos. Corre en el servidor con la clave de servicio, que nunca llega a la app.
//
//   GET  → { configurada: boolean }   la app decide si muestra el asistente o el ingreso.
//   POST → crea todo. Exige el código de instalación (secreto CODIGO_INSTALACION): mientras no
//          exista una administración, cualquiera con la dirección del proyecto podría reclamarla.
//
// Dos formas de crear al primer administrador:
//   - con una sesión ya iniciada (por ejemplo, con Google): la cuenta es la de esa sesión;
//   - sin sesión: se crea la cuenta con el email y la contraseña recibidos.
//
// Las respuestas de error llevan un código (campo `error`) que la app traduce a un mensaje.
import { createClient } from "npm:@supabase/supabase-js@2";
import { v7 as uuidv7 } from "npm:uuid@11";

const LARGO_MINIMO_CONTRASENA = 8; // igual que packages/domain/src/autenticacion.ts

const cabeceras = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const responder = (cuerpo: unknown, estado = 200) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { ...cabeceras, "Content-Type": "application/json" },
  });

const texto = (valor: unknown) => (typeof valor === "string" ? valor.trim() : "");

// Compara dos textos sin revelar, por el tiempo de respuesta, cuántos caracteres coinciden.
async function iguales(a: string, b: string): Promise<boolean> {
  const codificar = (s: string) => crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  const [ha, hb] = await Promise.all([codificar(a), codificar(b)]).then((r) => r.map((x) => new Uint8Array(x)));
  let diferencia = 0;
  for (let i = 0; i < ha.length; i++) diferencia |= ha[i] ^ hb[i];
  return diferencia === 0;
}

Deno.serve(async (peticion) => {
  if (peticion.method === "OPTIONS") return new Response(null, { status: 204, headers: cabeceras });

  const servidor = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { count, error: errorConsulta } = await servidor
    .from("organizacion")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null);
  if (errorConsulta) return responder({ error: "error_interno" }, 500);
  const configurada = (count ?? 0) > 0;

  if (peticion.method === "GET") return responder({ configurada });
  if (peticion.method !== "POST") return responder({ error: "metodo_no_permitido" }, 405);
  if (configurada) return responder({ error: "ya_configurada" }, 409);

  let cuerpo: Record<string, any>;
  try {
    cuerpo = await peticion.json();
  } catch {
    return responder({ error: "datos_invalidos" }, 400);
  }

  // Código de instalación.
  // Se ignoran espacios y comillas sobrantes alrededor del código guardado (suelen colarse al definirlo en la terminal).
  const esperado = (Deno.env.get("CODIGO_INSTALACION") ?? "").trim().replace(/^["']+|["']+$/g, "");
  if (!esperado) return responder({ error: "codigo_no_configurado" }, 500);
  if (!(await iguales(texto(cuerpo.codigoInstalacion), esperado))) {
    await new Promise((resolver) => setTimeout(resolver, 1500)); // frena los intentos repetidos
    return responder({ error: "codigo_incorrecto" }, 403);
  }

  // Datos recibidos (la app ya los validó; acá se vuelve a comprobar lo esencial).
  const organizacion = cuerpo.organizacion ?? {};
  const administrador = cuerpo.administrador ?? {};
  const nombreOrganizacion = texto(organizacion.nombre);
  const nombreAdministrador = texto(administrador.nombre);
  if (!nombreOrganizacion || !nombreAdministrador) return responder({ error: "datos_invalidos" }, 400);

  // ¿Hay una sesión iniciada (Google u otra)? Con la clave pública de la app, `getUser` falla y se
  // sigue por el camino de email y contraseña.
  const token = (peticion.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: sesion } = await servidor.auth.getUser(token);
  let usuarioId: string;
  let email: string;
  let cuentaCreadaAhora = false;

  if (sesion?.user?.email) {
    usuarioId = sesion.user.id;
    email = sesion.user.email;
  } else {
    email = texto(administrador.email).toLowerCase();
    const contrasena = typeof administrador.contrasena === "string" ? administrador.contrasena : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return responder({ error: "email_invalido" }, 400);
    if (contrasena.length < LARGO_MINIMO_CONTRASENA) return responder({ error: "contrasena_corta" }, 400);

    const { data: creado, error: errorCuenta } = await servidor.auth.admin.createUser({
      email,
      password: contrasena,
      email_confirm: true,
      user_metadata: { nombre: nombreAdministrador },
    });
    if (errorCuenta || !creado.user) {
      const yaExiste = /already|registered|exists/i.test(errorCuenta?.message ?? "");
      return responder({ error: yaExiste ? "email_en_uso" : "error_cuenta" }, yaExiste ? 409 : 500);
    }
    usuarioId = creado.user.id;
    cuentaCreadaAhora = true;
  }

  // Administración, primer administrador y conceptos: una sola operación en la base.
  const { error: errorBase } = await servidor.rpc("configuracion_inicial", {
    p_organizacion_id: uuidv7(),
    p_usuario_id: usuarioId,
    p_nombre_usuario: nombreAdministrador,
    p_email: email,
    p_organizacion: {
      nombre: nombreOrganizacion,
      cuit: texto(organizacion.cuit),
      contactoTelefono: texto(organizacion.contactoTelefono),
      contactoEmail: texto(organizacion.contactoEmail),
      contactoDireccion: texto(organizacion.contactoDireccion),
    },
  });

  if (errorBase) {
    if (cuentaCreadaAhora) await servidor.auth.admin.deleteUser(usuarioId); // no deja una cuenta suelta
    const yaConfigurada = /ADM-01/.test(errorBase.message);
    return responder({ error: yaConfigurada ? "ya_configurada" : "error_interno" }, yaConfigurada ? 409 : 500);
  }

  return responder({ ok: true });
});
