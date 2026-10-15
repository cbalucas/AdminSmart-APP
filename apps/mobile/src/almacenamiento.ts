// Preferencias simples del dispositivo (por ejemplo, el email recordado). Nunca se guardan contraseñas.
// Si el almacenamiento no está disponible, la app sigue funcionando sin recordar nada.
type Almacen = { getItem(clave: string): string | null; setItem(clave: string, valor: string): void; removeItem(clave: string): void };
const almacen = (): Almacen | undefined => (globalThis as { localStorage?: Almacen }).localStorage;

export function leerPreferencia(clave: string): string | null {
  try {
    return almacen()?.getItem(clave) ?? null;
  } catch {
    return null;
  }
}

export function guardarPreferencia(clave: string, valor: string | null): void {
  try {
    if (valor === null) almacen()?.removeItem(clave);
    else almacen()?.setItem(clave, valor);
  } catch {
    /* sin almacenamiento */
  }
}
