import "expo-sqlite/localStorage/install";
import { createClient } from "@supabase/supabase-js";
import { AppState } from "react-native";
import { SUPABASE_CLAVE, SUPABASE_URL } from "./entorno";

// La sesión se guarda en el dispositivo (almacenamiento de expo-sqlite) y se renueva sola.
// PKCE: el retorno de Google y de los enlaces del email trae un código, no el token.
export const supabase = createClient(SUPABASE_URL, SUPABASE_CLAVE, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: "pkce",
  },
});

// La renovación automática solo corre mientras la app está en primer plano.
AppState.addEventListener("change", (estado) => {
  if (estado === "active") supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
