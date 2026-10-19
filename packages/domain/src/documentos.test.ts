import { describe, expect, it } from "vitest";
import { formatearTamano, MAX_BYTES_DOCUMENTO, nombreSeguroArchivo, rutaDocumento, validarArchivoDocumento } from "./documentos";

describe("Archivos adjuntos", () => {
  it("DOC-01: acepta PDF e imágenes", () => {
    expect(validarArchivoDocumento({ tipoMime: "application/pdf", tamano: 1000 }).ok).toBe(true);
    expect(validarArchivoDocumento({ tipoMime: "image/jpeg", tamano: 1000 }).ok).toBe(true);
    expect(validarArchivoDocumento({ tipoMime: "image/png", tamano: 1000 }).ok).toBe(true);
  });
  it("DOC-01: rechaza otros tipos de archivo", () => {
    expect(validarArchivoDocumento({ tipoMime: "application/zip", tamano: 1000 })).toEqual({ ok: false, error: "validacion.archivo_tipo" });
    expect(validarArchivoDocumento({ tipoMime: "text/html", tamano: 1000 }).ok).toBe(false);
  });
  it("DOC-01: el límite es 25 MB", () => {
    expect(validarArchivoDocumento({ tipoMime: "application/pdf", tamano: MAX_BYTES_DOCUMENTO }).ok).toBe(true);
    expect(validarArchivoDocumento({ tipoMime: "application/pdf", tamano: MAX_BYTES_DOCUMENTO + 1 })).toEqual({ ok: false, error: "validacion.archivo_tamano" });
  });
  it("DOC-01: rechaza un archivo vacío", () => {
    expect(validarArchivoDocumento({ tipoMime: "application/pdf", tamano: 0 })).toEqual({ ok: false, error: "validacion.archivo_vacio" });
  });
  it("DOC-03: el nombre del archivo queda sin tildes ni símbolos y conserva la extensión", () => {
    expect(nombreSeguroArchivo("Boleta Luz — Octubre (1).PDF")).toBe("boleta-luz-octubre-1.pdf");
    expect(nombreSeguroArchivo("Reparación.jpeg")).toBe("reparacion.jpeg");
    expect(nombreSeguroArchivo("???")).toBe("archivo");
  });
  it("DOC-03: la ruta cuelga de la organización y del objeto", () => {
    expect(rutaDocumento({ organizacionId: "org", entidad: "obligacion", entidadId: "ob1", archivoId: "a1", nombre: "Boleta.pdf" })).toBe("org/obligacion/ob1/a1-boleta.pdf");
  });
  it("DOC-01: el tamaño se muestra legible", () => {
    expect(formatearTamano(500)).toBe("500 B");
    expect(formatearTamano(1536)).toBe("1,5 KB");
    expect(formatearTamano(3 * 1024 * 1024)).toBe("3,0 MB");
  });
});
