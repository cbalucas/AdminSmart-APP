"use client";

import { useRef, useState } from "react";
import { t } from "@ai/i18n";
import { formatearTamano, generarUuidV7, rutaDocumento, validarArchivoDocumento, type EntidadDocumento, type TipoDocumento } from "@ai/domain";
import { Icono } from "@/components/Iconos";
import { crearClienteNavegador } from "@/lib/supabase/navegador";
import type { AdjuntoSubido, DocumentoFila } from "@/lib/documentos";

// Adjuntos de un objeto (diccionario 15): foto o PDF, hasta 25 MB. Cada archivo se sube al almacén
// privado apenas se elige; queda registrado cuando se guarda el formulario (campo oculto `adjuntos`).
// Nunca se pisa ni se borra un archivo: cada uno lleva su propio nombre.
export function CampoAdjuntos({
  organizacionId,
  entidad,
  entidadId,
  tipo,
  existentes,
  etiqueta,
}: {
  organizacionId: string;
  entidad: EntidadDocumento;
  entidadId: string;
  tipo: TipoDocumento;
  existentes: DocumentoFila[];
  etiqueta: string;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [subidos, setSubidos] = useState<AdjuntoSubido[]>([]);
  const [subiendo, setSubiendo] = useState(false);
  // Vista previa de las fotos recién elegidas (ruta del almacén → dirección local de la imagen).
  const [vistas, setVistas] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  async function elegir(archivos: FileList | null) {
    if (!archivos || archivos.length === 0) return;
    setError(null);
    setSubiendo(true);
    const supabase = crearClienteNavegador();
    const nuevos: AdjuntoSubido[] = [];
    for (const archivo of Array.from(archivos)) {
      const valido = validarArchivoDocumento({ tipoMime: archivo.type, tamano: archivo.size });
      if (!valido.ok) {
        setError(valido.error);
        continue;
      }
      const path = rutaDocumento({ organizacionId, entidad, entidadId, archivoId: generarUuidV7(), nombre: archivo.name });
      const { error: errorSubida } = await supabase.storage.from("documentos").upload(path, archivo, { contentType: archivo.type });
      if (errorSubida) {
        setError("adjuntos.error_subir");
        continue;
      }
      nuevos.push({ path, nombre: archivo.name, tipoMime: archivo.type, tamano: archivo.size, tipo, visiblePropietario: false });
      if (archivo.type.startsWith("image/")) setVistas((v) => ({ ...v, [path]: URL.createObjectURL(archivo) }));
    }
    setSubidos((s) => [...s, ...nuevos]);
    setSubiendo(false);
    if (entrada.current) entrada.current.value = "";
  }

  const cambiarVisible = (path: string, visible: boolean) =>
    setSubidos((s) => s.map((a) => (a.path === path ? { ...a, visiblePropietario: visible } : a)));
  const quitar = (path: string) => setSubidos((s) => s.filter((a) => a.path !== path));

  return (
    <div className="adjuntos">
      <input type="hidden" name="adjuntos" value={JSON.stringify(subidos)} />
      <span className="etiqueta-lista">{etiqueta}</span>

      {(existentes.length > 0 || subidos.length > 0) && (
        <ul className="adjuntos-lista">
          {existentes.map((d) => (
            <li key={d.id}>
              <Miniatura url={d.tipoMime.startsWith("image/") ? d.url : null} />
              <span>
                {d.url ? <a href={d.url} target="_blank" rel="noreferrer">{d.nombre}</a> : d.nombre}
                <span className="muted"> · {formatearTamano(d.tamano)}{d.visiblePropietario ? ` · ${t("adjuntos.visible")}` : ""}</span>
              </span>
            </li>
          ))}
          {subidos.map((a) => (
            <li key={a.path}>
              <Miniatura url={vistas[a.path] ?? null} />
              <span>
                {a.nombre}
                <span className="muted"> · {formatearTamano(a.tamano)} · {t("adjuntos.listo")}</span>
              </span>
              <label className="casilla">
                <input type="checkbox" checked={a.visiblePropietario} onChange={(e) => cambiarVisible(a.path, e.target.checked)} />
                {t("adjuntos.visible_propietario")}
              </label>
              <button type="button" className="boton-texto" onClick={() => quitar(a.path)}>{t("app.quitar")}</button>
            </li>
          ))}
        </ul>
      )}

      <div>
        <input
          ref={entrada}
          id={`adjunto-${tipo}`}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          multiple
          hidden
          onChange={(e) => void elegir(e.target.files)}
        />
        <button type="button" className="boton-adjuntar" disabled={subiendo} onClick={() => entrada.current?.click()}>
          <Icono nombre="camara" tamano={20} />
          {subiendo ? t("adjuntos.subiendo") : t("adjuntos.agregar")}
        </button>
        <p className="muted">{t("adjuntos.ayuda")}</p>
      </div>
      {error && <p className="error-campo" role="alert">{t(error)}</p>}
    </div>
  );
}

// Miniatura de una foto, o el ícono de documento para un PDF.
function Miniatura({ url }: { url: string | null }) {
  return (
    <span className="miniatura" aria-hidden="true">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" />
      ) : (
        <Icono nombre="documento" tamano={20} />
      )}
    </span>
  );
}
