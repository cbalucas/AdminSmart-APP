import esAR from "./es-AR.json";

// La versión 1.0 es solo en español (Argentina). Ningún texto visible va escrito en las pantallas.
export type ClaveTexto = keyof typeof esAR;

const textos: Record<string, string> = esAR;

// Reemplaza {nombre} por el valor recibido. Una clave faltante muestra la propia clave.
export function t(clave: ClaveTexto | (string & {}), valores?: Record<string, string | number>): string {
  const texto = textos[clave] ?? clave;
  if (!valores) return texto;
  return texto.replace(/\{(\w+)\}/g, (original, nombre: string) =>
    nombre in valores ? String(valores[nombre]) : original,
  );
}

export { esAR };
