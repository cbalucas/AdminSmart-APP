import { esquemaBien, esquemaTitular, type DatosBien } from "@ai/domain";

export interface EstadoFormularioBien {
  /** Clave de texto de cada campo con error (por nombre de campo). */
  errores?: Record<string, string>;
  error?: string;
}

const texto = (f: FormData, nombre: string) => String(f.get(nombre) ?? "");
const numero = (f: FormData, nombre: string): number | null => {
  const v = texto(f, nombre).trim().replace(",", ".");
  return v === "" ? null : Number(v);
};

function erroresDe(issues: { path: PropertyKey[]; message: string }[], porDefecto: string) {
  const errores: Record<string, string> = {};
  for (const issue of issues) {
    const campo = String(issue.path[0] ?? "general");
    errores[campo] ??= issue.message.startsWith("validacion.") ? issue.message : porDefecto;
  }
  return errores;
}

/**
 * Convierte el formulario en datos validados. `edificioExistente` lo decide el servidor (no el
 * navegador): indica si el nombre escrito corresponde a un edificio ya cargado.
 */
export function leerFormularioBien(
  f: FormData,
  edificioExistente: boolean,
): { ok: true; datos: DatosBien } | { ok: false; errores: Record<string, string> } {
  const r = esquemaBien.safeParse({
    tipoBien: texto(f, "tipoBien"),
    subtipo: texto(f, "subtipo"),
    alias: texto(f, "alias"),
    calle: texto(f, "calle"),
    numero: texto(f, "numero"),
    piso: texto(f, "piso"),
    departamento: texto(f, "departamento"),
    localidad: texto(f, "localidad"),
    provincia: texto(f, "provincia"),
    codigoPostal: texto(f, "codigoPostal"),
    latitud: numero(f, "latitud"),
    longitud: numero(f, "longitud"),
    dominio: texto(f, "dominio"),
    marcaModelo: texto(f, "marcaModelo"),
    anio: numero(f, "anio"),
    estado: texto(f, "estado") || undefined,
    edificioNombre: texto(f, "edificioNombre"),
    edificioExistente,
    unidadFuncional: texto(f, "unidadFuncional"),
    observaciones: texto(f, "observaciones"),
  });
  return r.success ? { ok: true, datos: r.data } : { ok: false, errores: erroresDe(r.error.issues, "bienes.error_guardar") };
}

export function leerTitularInicial(f: FormData) {
  const r = esquemaTitular.safeParse({
    propietarioId: texto(f, "propietarioId"),
    porcentaje: numero(f, "porcentaje"),
  });
  return r.success
    ? { ok: true as const, datos: r.data }
    : { ok: false as const, errores: erroresDe(r.error.issues, "bienes.error_guardar") };
}

/** Datos del bien tal como los guarda la base. Las columnas que no corresponden al tipo quedan vacías. */
export function aFilaBien(d: DatosBien, edificioId: string | null) {
  const conDireccion = d.tipoBien === "inmueble" || d.tipoBien === "terreno";
  const hereda = edificioId !== null;
  return {
    tipo_bien: d.tipoBien,
    subtipo: d.subtipo,
    alias: d.alias,
    calle: conDireccion && !hereda ? d.calle : null,
    numero: conDireccion && !hereda ? d.numero : null,
    piso: conDireccion ? d.piso : null,
    departamento: conDireccion ? d.departamento : null,
    localidad: conDireccion && !hereda ? d.localidad : null,
    provincia: conDireccion && !hereda ? d.provincia : null,
    codigo_postal: conDireccion && !hereda ? d.codigoPostal : null,
    latitud: conDireccion ? d.latitud : null,
    longitud: conDireccion ? d.longitud : null,
    dominio: d.tipoBien === "vehiculo" ? d.dominio : null,
    marca_modelo: d.tipoBien === "vehiculo" ? d.marcaModelo : null,
    anio: d.tipoBien === "vehiculo" ? d.anio : null,
    estado: d.estado,
    edificio_id: d.tipoBien === "inmueble" ? edificioId : null,
    unidad_funcional: d.tipoBien === "inmueble" ? d.unidadFuncional : null,
    observaciones: d.observaciones,
  };
}
