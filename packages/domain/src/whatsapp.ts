// Envío por WhatsApp: elección del teléfono y enlace wa.me (RF de envíos, 06-textos-de-envio).

export interface TelefonoContacto {
  tipo: string;
  numero: string;
}

/**
 * Teléfono para WhatsApp: el celular. Si no hay celular se usa otro que no sea fijo ni de trabajo; sin ninguno,
 * la opción de WhatsApp queda deshabilitada con el motivo.
 */
export function elegirTelefonoWhatsApp(telefonos: readonly TelefonoContacto[]): TelefonoContacto | null {
  return telefonos.find((t) => t.tipo === "celular") ?? telefonos.find((t) => t.tipo !== "fijo" && t.tipo !== "trabajo") ?? null;
}

/**
 * Número en el formato de wa.me (solo dígitos, con código de país). Se asume Argentina (54) cuando no hay
 * otro código: los celulares llevan 549 + característica + número, sin 0 ni 15. Devuelve null si no se puede armar.
 */
export function numeroParaWhatsApp(numero: string): string | null {
  const conMas = numero.trim().startsWith("+");
  let d = numero.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 0) return null;

  if (d.startsWith("54")) {
    let resto = d.slice(2);
    if (resto.startsWith("0")) resto = resto.slice(1);
    if (!resto.startsWith("9")) resto = `9${resto}`;
    d = `54${resto}`;
  } else if (conMas) {
    // Número extranjero con +: se respeta tal cual.
  } else {
    if (d.startsWith("0")) d = d.slice(1);
    // Característica + 15 + número (10 dígitos en total sin el 15): se saca el 15.
    const m = d.match(/^(\d{2,4})15(\d{6,8})$/);
    if (m && `${m[1]}${m[2]}`.length === 10) d = `${m[1]}${m[2]}`;
    if (d.length !== 10) return null;
    d = `549${d}`;
  }
  return d.length >= 11 && d.length <= 15 ? d : null;
}

/** Enlace que abre la conversación de WhatsApp con el texto ya escrito. */
export function enlaceWhatsApp(numero: string, texto: string): string | null {
  const n = numeroParaWhatsApp(numero);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(texto)}` : null;
}
