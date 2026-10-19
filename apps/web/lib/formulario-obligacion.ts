import { esquemaObligacion, type DatosObligacion } from "@ai/domain";

export interface EstadoFormularioObligacion {
  /** Clave de texto de cada campo con error (por nombre de campo). */
  errores?: Record<string, string>;
  error?: string;
}

const texto = (f: FormData, nombre: string) => String(f.get(nombre) ?? "");

export function leerFormularioObligacion(
  f: FormData,
): { ok: true; datos: DatosObligacion } | { ok: false; errores: Record<string, string> } {
  const r = esquemaObligacion.safeParse({
    bienId: texto(f, "bienId"),
    bienServicioId: texto(f, "bienServicioId"),
    conceptoId: texto(f, "conceptoId"),
    periodo: texto(f, "periodo"),
    esRecurrente: f.get("esRecurrente") === "on",
    frecuencia: texto(f, "frecuencia") || null,
    monto: texto(f, "monto"),
    moneda: texto(f, "moneda") || undefined,
    responsable: texto(f, "responsable"),
    vencimiento: texto(f, "vencimiento"),
    descripcion: texto(f, "descripcion"),
    codigoPago: texto(f, "codigoPago"),
    observaciones: texto(f, "observaciones"),
  });
  if (r.success) return { ok: true, datos: r.data };
  const errores: Record<string, string> = {};
  for (const issue of r.error.issues) {
    const campo = String(issue.path[0] ?? "general");
    errores[campo] ??= issue.message.startsWith("validacion.") ? issue.message : "obligaciones.error_guardar";
  }
  return { ok: false, errores };
}
