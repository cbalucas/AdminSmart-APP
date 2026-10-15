// Datos de conexión con Supabase (archivo apps/web/.env.local). Si faltan, falla con un mensaje claro.
function exigir(valor: string | undefined, nombre: string): string {
  if (!valor) {
    throw new Error(`Falta ${nombre} en apps/web/.env.local. Copiá apps/web/.env.example y completá los valores.`);
  }
  return valor;
}

// Next.js solo reemplaza las variables públicas cuando se escriben completas, una por una.
export const SUPABASE_URL = exigir(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL");
export const SUPABASE_CLAVE = exigir(
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
);
