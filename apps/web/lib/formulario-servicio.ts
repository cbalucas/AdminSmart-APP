import { esquemaServicio, monedaDelMonto, type DatosServicio } from "@ai/domain";

export interface EstadoFormularioServicio {
  /** Clave de texto de cada campo con error (por nombre de campo). */
  errores?: Record<string, string>;
  error?: string;
}

const texto = (f: FormData, nombre: string) => String(f.get(nombre) ?? "");

export function leerFormularioServicio(
  f: FormData,
): { ok: true; datos: DatosServicio } | { ok: false; errores: Record<string, string> } {
  const dia = texto(f, "diaVencimiento").trim();
  const r = esquemaServicio.safeParse({
    conceptoId: texto(f, "conceptoId"),
    nroCuentaCliente: texto(f, "nroCuentaCliente"),
    empresaPrestadora: texto(f, "empresaPrestadora"),
    responsableDefault: texto(f, "responsableDefault"),
    estado: texto(f, "estado") || undefined,
    titularServicio: texto(f, "titularServicio"),
    periodicidad: texto(f, "periodicidad") || null,
    diaVencimiento: dia === "" ? null : Number(dia),
    montoEstimado: texto(f, "montoEstimado"),
    montoEstimadoMoneda: texto(f, "montoEstimadoMoneda") || undefined,
    debitoAutomatico: f.get("debitoAutomatico") === "on",
    sitioBoletas: texto(f, "sitioBoletas"),
    observaciones: texto(f, "observaciones"),
  });
  if (r.success) return { ok: true, datos: r.data };
  const errores: Record<string, string> = {};
  for (const issue of r.error.issues) {
    const campo = String(issue.path[0] ?? "general");
    errores[campo] ??= issue.message.startsWith("validacion.") ? issue.message : "servicios.error_guardar";
  }
  return { ok: false, errores };
}

/** Datos del servicio tal como los guarda la base. */
export function aFilaServicio(d: DatosServicio) {
  return {
    concepto_id: d.conceptoId,
    nro_cuenta_cliente: d.nroCuentaCliente,
    empresa_prestadora: d.empresaPrestadora,
    responsable_default: d.responsableDefault,
    estado: d.estado,
    titular_servicio: d.titularServicio,
    periodicidad: d.periodicidad,
    dia_vencimiento: d.diaVencimiento,
    monto_estimado: d.montoEstimado,
    monto_estimado_moneda: monedaDelMonto(d),
    debito_automatico: d.debitoAutomatico,
    sitio_boletas: d.sitioBoletas,
    observaciones: d.observaciones,
  };
}
