import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "./supabase";

// Ingreso con Google: se abre el navegador del sistema y, al volver, se canjea el código por la sesión.
// Devuelve true si quedó una sesión iniciada. La dirección de retorno debe estar autorizada en
// Supabase (Authentication → URL Configuration).
export async function ingresarConGoogle(): Promise<boolean> {
  const retorno = Linking.createURL("auth/callback");
  // En desarrollo, esta es la dirección que debe estar autorizada en Supabase (URL Configuration).
  if (__DEV__) console.log("Dirección de retorno de Google:", retorno);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: retorno, skipBrowserRedirect: true },
  });
  if (error || !data.url) return false;

  const resultado = await WebBrowser.openAuthSessionAsync(data.url, retorno);
  if (resultado.type !== "success") return false;

  const codigo = new URL(resultado.url).searchParams.get("code");
  if (!codigo) return false;
  const { error: errorCanje } = await supabase.auth.exchangeCodeForSession(codigo);
  return !errorCanje;
}
