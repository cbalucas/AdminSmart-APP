import { NextResponse, type NextRequest } from "next/server";
import { crearClienteServidor } from "@/lib/supabase/servidor";

// Retorno de Google y del enlace del email: canjea el código por la sesión y sigue al destino.
export async function GET(peticion: NextRequest) {
  const { searchParams, origin } = peticion.nextUrl;
  const codigo = searchParams.get("code");
  const siguiente = searchParams.get("next") ?? "/inicio";
  // Solo rutas internas: evita que el enlace lleve a otro sitio.
  const destino = siguiente.startsWith("/") && !siguiente.startsWith("//") ? siguiente : "/inicio";

  if (codigo) {
    const supabase = await crearClienteServidor();
    const { error } = await supabase.auth.exchangeCodeForSession(codigo);
    if (!error) return NextResponse.redirect(`${origin}${destino}`);
  }
  return NextResponse.redirect(`${origin}/ingreso?error=enlace`);
}
