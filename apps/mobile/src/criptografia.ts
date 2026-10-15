// El motor del teléfono no trae la API Web Crypto que usa Supabase para proteger el ingreso con
// Google y los enlaces del email (PKCE con SHA-256). Sin ella, Supabase avisa y usa un método más
// débil. Acá se completa con expo-crypto. Este archivo debe importarse antes de crear el cliente.
import * as Crypto from "expo-crypto";

type ObjetoCrypto = {
  getRandomValues?: typeof Crypto.getRandomValues;
  subtle?: { digest: (algoritmo: string | { name: string }, datos: BufferSource) => Promise<ArrayBuffer> };
};

const global = globalThis as { crypto?: ObjetoCrypto };
const destino: ObjetoCrypto = global.crypto ?? {};

destino.getRandomValues ??= Crypto.getRandomValues;
destino.subtle ??= {
  digest: (algoritmo, datos) =>
    Crypto.digest((typeof algoritmo === "string" ? algoritmo : algoritmo.name) as Crypto.CryptoDigestAlgorithm, datos),
};

if (!global.crypto) Object.defineProperty(globalThis, "crypto", { value: destino, configurable: true });
