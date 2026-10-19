// Archivos adjuntos (diccionario 15): boletas, comprobantes, contratos, recibos y fotos.
// Los mensajes de error son claves de `packages/i18n/src/es-AR.json`.

export const TIPOS_DOCUMENTO = ["contrato", "boleta", "comprobante", "recibo", "foto", "otro"] as const;
export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number];

export const ENTIDADES_DOCUMENTO = [
  "bien", "propietario", "inquilino", "contrato", "obligacion", "pago", "cobro_alquiler", "movimiento", "liquidacion",
] as const;
export type EntidadDocumento = (typeof ENTIDADES_DOCUMENTO)[number];

/** El almacén solo acepta PDF e imágenes comunes. */
export const TIPOS_MIME_DOCUMENTO = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;
export const MAX_BYTES_DOCUMENTO = 25 * 1024 * 1024;

export type ResultadoArchivo = { ok: true } | { ok: false; error: "validacion.archivo_tipo" | "validacion.archivo_tamano" | "validacion.archivo_vacio" };

/** Diccionario 15: PDF o imagen, hasta 25 MB. */
export function validarArchivoDocumento(a: { tipoMime: string; tamano: number }): ResultadoArchivo {
  if (!(TIPOS_MIME_DOCUMENTO as readonly string[]).includes(a.tipoMime)) return { ok: false, error: "validacion.archivo_tipo" };
  if (a.tamano <= 0) return { ok: false, error: "validacion.archivo_vacio" };
  if (a.tamano > MAX_BYTES_DOCUMENTO) return { ok: false, error: "validacion.archivo_tamano" };
  return { ok: true };
}

/** Nombre apto para la ruta del almacén: sin tildes, espacios ni símbolos; se conserva la extensión. */
export function nombreSeguroArchivo(nombre: string): string {
  const limpio = nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
  const punto = limpio.lastIndexOf(".");
  const base = (punto > 0 ? limpio.slice(0, punto) : limpio).replace(/[-.]+$/g, "");
  const extension = punto > 0 ? limpio.slice(punto) : "";
  return `${base.slice(0, 60) || "archivo"}${extension.slice(0, 8)}`;
}

/** SEG-03, DOC-03: documentos/<organizacion>/<entidad>/<entidad_id>/<archivo_id>-<nombre>. */
export function rutaDocumento(a: { organizacionId: string; entidad: EntidadDocumento; entidadId: string; archivoId: string; nombre: string }): string {
  return `${a.organizacionId}/${a.entidad}/${a.entidadId}/${a.archivoId}-${nombreSeguroArchivo(a.nombre)}`;
}

/** 1.234 → "1,2 KB"; 3.400.000 → "3,2 MB". */
export function formatearTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1).replace(".", ",")} KB`;
  return `${(kb / 1024).toFixed(1).replace(".", ",")} MB`;
}
