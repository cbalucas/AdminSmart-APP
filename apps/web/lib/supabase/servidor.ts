import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_CLAVE, SUPABASE_URL } from "../entorno";

// Cliente para páginas y acciones del servidor: la sesión viaja en cookies.
export async function crearClienteServidor() {
  const almacen = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_CLAVE, {
    cookies: {
      getAll: () => almacen.getAll(),
      setAll: (lista) => {
        try {
          lista.forEach(({ name, value, options }) => almacen.set(name, value, options));
        } catch {
          // Desde una página (no una acción) las cookies no se pueden escribir: la renovación
          // de la sesión la hace proxy.ts.
        }
      },
    },
  });
}
