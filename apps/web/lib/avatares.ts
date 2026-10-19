import { crearClienteServidor } from "@/lib/supabase/servidor";

// El almacén de avatares es privado: se muestra con enlaces firmados de vencimiento corto.
// Devuelve un mapa ruta → enlace; las rutas vacías o que fallan se omiten (se verán las iniciales).
export async function enlacesDeAvatares(rutas: (string | null | undefined)[]): Promise<Map<string, string>> {
  const unicas = [...new Set(rutas.filter((r): r is string => Boolean(r)))];
  const mapa = new Map<string, string>();
  if (unicas.length === 0) return mapa;
  const supabase = await crearClienteServidor();
  const { data } = await supabase.storage.from("avatares").createSignedUrls(unicas, 60 * 60);
  for (const f of data ?? []) {
    if (f.path && f.signedUrl) mapa.set(f.path, f.signedUrl);
  }
  return mapa;
}
