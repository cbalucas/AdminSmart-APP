import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Renueva la sesión en cada petición y envía a Ingreso a quien no la tiene.
// Rutas que se pueden abrir sin sesión: ingreso, recuperación, configuración inicial y el
// retorno de Google o del enlace del email.
const RUTAS_PUBLICAS = ["/ingreso", "/recuperar", "/configuracion-inicial", "/auth"];

export async function proxy(peticion: NextRequest) {
  let respuesta = NextResponse.next({ request: peticion });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => peticion.cookies.getAll(),
        setAll: (lista) => {
          lista.forEach(({ name, value }) => peticion.cookies.set(name, value));
          respuesta = NextResponse.next({ request: peticion });
          lista.forEach(({ name, value, options }) => respuesta.cookies.set(name, value, options));
        },
      },
    },
  );

  // `getClaims` valida la sesión y renueva el token si hace falta.
  const { data } = await supabase.auth.getClaims();
  const conSesion = Boolean(data?.claims);
  const ruta = peticion.nextUrl.pathname;
  const esPublica = ruta === "/" || RUTAS_PUBLICAS.some((p) => ruta === p || ruta.startsWith(`${p}/`));

  if (!conSesion && !esPublica) {
    const destino = peticion.nextUrl.clone();
    destino.pathname = "/ingreso";
    destino.search = "";
    return NextResponse.redirect(destino);
  }
  return respuesta;
}

export const config = {
  // Todo menos archivos estáticos e imágenes.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
