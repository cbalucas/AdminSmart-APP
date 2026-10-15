// Datos de conexión con Supabase (archivo apps/mobile/.env). Si faltan, falla con un mensaje claro.
// Expo reemplaza las variables EXPO_PUBLIC_ al compilar, por eso se leen escritas completas.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const clave = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !clave) {
  throw new Error(
    "Falta EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_ANON_KEY en apps/mobile/.env. Copiá apps/mobile/.env.example y completá los valores.",
  );
}

export const SUPABASE_URL: string = url;
export const SUPABASE_CLAVE: string = clave;
