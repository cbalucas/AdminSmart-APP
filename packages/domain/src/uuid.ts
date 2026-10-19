// UUID v7 (RFC 9562): 48 bits de milisegundos + azar. Se generan en el cliente (sección 5.1),
// así se pueden crear registros sin conexión sin colisiones, y quedan ordenados por fecha de alta.
export function generarUuidV7(
  ahora: number = Date.now(),
  azar: Uint8Array = globalThis.crypto.getRandomValues(new Uint8Array(10)),
): string {
  const bytes = new Uint8Array(16);
  const marca = Math.floor(ahora);
  // 48 bits de tiempo, del más significativo al menos (sin operadores de 32 bits: superan 2^32).
  for (let i = 0; i < 6; i++) {
    bytes[i] = Math.floor(marca / 2 ** (8 * (5 - i))) & 0xff;
  }
  bytes[6] = 0x70 | (azar[0]! & 0x0f); // versión 7
  bytes[7] = azar[1]!;
  bytes[8] = 0x80 | (azar[2]! & 0x3f); // variante RFC
  for (let i = 9; i < 16; i++) bytes[i] = azar[i - 6]!;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export const esUuid = (valor: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(valor);
