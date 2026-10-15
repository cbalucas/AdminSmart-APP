import esAR from "./es-AR.json";

// La versión 1.0 es solo en español (Argentina). Ningún texto visible va escrito en las pantallas.
export type ClaveTexto = keyof typeof esAR;

const textos: Record<ClaveTexto, string> = esAR;

// Una clave faltante muestra el texto en español.
export function t(clave: ClaveTexto): string {
  return textos[clave] ?? clave;
}

export { esAR };
