import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_CLAVE, SUPABASE_URL } from "../entorno";

// Cliente para los componentes que corren en el navegador.
export function crearClienteNavegador() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_CLAVE);
}
