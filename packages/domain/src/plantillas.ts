// Plantillas de envío (diccionario 19, P-49). Texto con datos entre llaves que el sistema completa al enviar.
export const DOCUMENTOS_PLANTILLA = ["liquidacion", "resumen_deposito", "recibo"] as const;
export type DocumentoPlantilla = (typeof DOCUMENTOS_PLANTILLA)[number];
export const CANALES_PLANTILLA = ["email", "whatsapp"] as const;
export type CanalPlantilla = (typeof CANALES_PLANTILLA)[number];

export const VARIABLES_PLANTILLA = ["nombre", "administracion", "numero", "periodo", "bien", "monto", "fecha_limite", "resultado", "datos_deposito"] as const;
export type VariablePlantilla = (typeof VARIABLES_PLANTILLA)[number];

/** Datos que se pueden insertar en cada documento (06-textos-de-envio: "Datos que completa el sistema"). */
export const VARIABLES_POR_DOCUMENTO: Record<DocumentoPlantilla, readonly VariablePlantilla[]> = {
  liquidacion: ["nombre", "administracion", "numero", "periodo", "resultado"],
  resumen_deposito: ["nombre", "administracion", "numero", "monto", "fecha_limite", "datos_deposito"],
  recibo: ["nombre", "administracion", "numero", "periodo", "bien", "monto"],
};

/** Datos entre llaves que aparecen en un texto, sin repetir. */
export function variablesDeTexto(texto: string): string[] {
  return [...new Set([...texto.matchAll(/\{([^{}]*)\}/g)].map((m) => (m[1] as string).trim()))];
}

export type ErrorPlantilla =
  | { error: "validacion.plantilla_cuerpo" }
  | { error: "validacion.plantilla_asunto" }
  | { error: "validacion.plantilla_variable"; desconocidas: string[] };

/**
 * PLA-01, PLA-02: el cuerpo es obligatorio, el asunto también en el email, y un dato entre llaves que el sistema
 * no reconoce para ese documento impide guardar la plantilla.
 */
export function validarPlantilla(p: { documento: DocumentoPlantilla; canal: CanalPlantilla; asunto: string; cuerpo: string }): ErrorPlantilla | null {
  if (p.cuerpo.trim() === "") return { error: "validacion.plantilla_cuerpo" };
  if (p.canal === "email" && p.asunto.trim() === "") return { error: "validacion.plantilla_asunto" };
  const permitidas = VARIABLES_POR_DOCUMENTO[p.documento] as readonly string[];
  const usadas = variablesDeTexto(`${p.canal === "email" ? p.asunto : ""}\n${p.cuerpo}`);
  const desconocidas = usadas.filter((v) => !permitidas.includes(v));
  return desconocidas.length > 0 ? { error: "validacion.plantilla_variable", desconocidas } : null;
}

/** Reemplaza cada {dato} por su valor. Un dato sin valor se deja entre llaves (por ejemplo {numero} hasta generar el PDF). */
export function completarPlantilla(texto: string, valores: Partial<Record<string, string>>): string {
  return texto.replace(/\{([^{}]*)\}/g, (original, nombre: string) => {
    const valor = valores[nombre.trim()];
    return valor === undefined ? original : valor;
  });
}
