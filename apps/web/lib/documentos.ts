import { generarUuidV7, TIPOS_DOCUMENTO, validarArchivoDocumento, type EntidadDocumento, type TipoDocumento } from "@ai/domain";
import { crearClienteServidor } from "@/lib/supabase/servidor";

/** Archivo ya subido al almacén desde el navegador, a la espera de registrarse junto con su objeto. */
export interface AdjuntoSubido {
  path: string;
  nombre: string;
  tipoMime: string;
  tamano: number;
  tipo: TipoDocumento;
  visiblePropietario: boolean;
}

export interface DocumentoFila {
  id: string;
  nombre: string;
  tipo: TipoDocumento;
  tipoMime: string;
  tamano: number;
  visiblePropietario: boolean;
  url: string | null;
}

/** Lee el campo oculto `adjuntos` del formulario (JSON); lo que no es válido se descarta. */
export function leerAdjuntos(f: FormData): AdjuntoSubido[] {
  try {
    const crudo = JSON.parse(String(f.get("adjuntos") ?? "[]"));
    if (!Array.isArray(crudo)) return [];
    return crudo.filter(
      (a): a is AdjuntoSubido =>
        typeof a?.path === "string" && typeof a?.nombre === "string" && typeof a?.tipoMime === "string" &&
        typeof a?.tamano === "number" && (TIPOS_DOCUMENTO as readonly string[]).includes(a?.tipo),
    );
  } catch {
    return [];
  }
}

// Registra en `documento` los archivos subidos. La ruta debe colgar de la organización y del objeto (SEG-03).
export async function registrarDocumentos(
  organizacionId: string,
  entidad: EntidadDocumento,
  entidadId: string,
  adjuntos: AdjuntoSubido[],
): Promise<{ error?: string }> {
  if (adjuntos.length === 0) return {};
  const prefijo = `${organizacionId}/${entidad}/${entidadId}/`;
  const filas = [];
  for (const a of adjuntos) {
    if (!a.path.startsWith(prefijo) || a.path.includes("..")) return { error: "adjuntos.error_registrar" };
    if (!validarArchivoDocumento({ tipoMime: a.tipoMime, tamano: a.tamano }).ok) return { error: "adjuntos.error_registrar" };
    filas.push({
      id: generarUuidV7(),
      organizacion_id: organizacionId,
      entidad,
      entidad_id: entidadId,
      tipo: a.tipo,
      visible_propietario: a.visiblePropietario,
      archivo_path: a.path,
      tipo_mime: a.tipoMime,
      tamano_bytes: a.tamano,
      descripcion: a.nombre,
    });
  }
  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("documento").insert(filas);
  return error ? { error: "adjuntos.error_registrar" } : {};
}

// Documentos de varios objetos de un mismo tipo, con enlace temporal de una hora (DOC-03).
export async function documentosDe(entidad: EntidadDocumento, ids: string[], tipo?: TipoDocumento): Promise<Map<string, DocumentoFila[]>> {
  const mapa = new Map<string, DocumentoFila[]>();
  if (ids.length === 0) return mapa;
  const supabase = await crearClienteServidor();
  let q = supabase.from("documento").select("*").eq("entidad", entidad).in("entidad_id", ids).is("deleted_at", null).order("created_at");
  if (tipo) q = q.eq("tipo", tipo);
  const { data } = await q;
  const filas = data ?? [];
  const { data: firmados } = filas.length
    ? await supabase.storage.from("documentos").createSignedUrls(filas.map((d) => d.archivo_path as string), 60 * 60)
    : { data: [] as { path: string | null; signedUrl: string }[] };
  const urlDe = new Map((firmados ?? []).map((f) => [f.path, f.signedUrl]));
  for (const d of filas) {
    const lista = mapa.get(d.entidad_id as string) ?? [];
    lista.push({
      id: d.id as string,
      nombre: (d.descripcion as string | null) ?? "archivo",
      tipo: d.tipo as TipoDocumento,
      tipoMime: d.tipo_mime as string,
      tamano: Number(d.tamano_bytes),
      visiblePropietario: Boolean(d.visible_propietario),
      url: urlDe.get(d.archivo_path as string) ?? null,
    });
    mapa.set(d.entidad_id as string, lista);
  }
  return mapa;
}
