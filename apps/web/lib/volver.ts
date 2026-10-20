// Pantallas a las que se puede volver desde un bien o una cuenta corriente: la ficha de un propietario (y su pestaña).
const RUTA_PROPIETARIO = /^\/propietarios\/([0-9a-f-]{36})(?:\?tab=[a-z]+)?$/;

/** Devuelve la ruta de retorno si es una ficha de propietario válida (nunca una dirección externa). */
export function rutaDeVolver(valor: string | undefined): { href: string; propietarioId: string } | null {
  if (!valor) return null;
  const m = RUTA_PROPIETARIO.exec(valor);
  return m ? { href: valor, propietarioId: m[1]! } : null;
}

/** Parámetro `volver` para encadenar a otra pantalla. */
export const conVolver = (ruta: string) => `volver=${encodeURIComponent(ruta)}`;
