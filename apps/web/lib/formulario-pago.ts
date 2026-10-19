import { esquemaPago, esquemaPagoDirecto, type DatosPago, type DatosPagoDirecto } from "@ai/domain";

export interface EstadoFormularioPago {
  /** Clave de texto de cada campo con error (por nombre de campo). */
  errores?: Record<string, string>;
  error?: string;
  /** MOV-07: nombres de los propietarios cuya cuenta quedaría con saldo deudor; hay que confirmarlo. */
  avisoSaldo?: string[];
}

const texto = (f: FormData, nombre: string) => String(f.get(nombre) ?? "");

function campos(f: FormData) {
  return {
    fecha: texto(f, "fecha"),
    importe: texto(f, "importe"),
    pagadoPor: texto(f, "pagadoPor"),
    medio: texto(f, "medio") || null,
    nroOperacion: texto(f, "nroOperacion"),
    observaciones: texto(f, "observaciones"),
    motivoDiferencia: texto(f, "motivoDiferencia"),
    confirmarDiferencia: f.get("confirmarDiferencia") === "on",
  };
}

function aErrores(issues: { path: PropertyKey[]; message: string }[]): Record<string, string> {
  const errores: Record<string, string> = {};
  for (const issue of issues) {
    const campo = String(issue.path[0] ?? "general");
    errores[campo] ??= issue.message.startsWith("validacion.") ? issue.message : "pagos.error_guardar";
  }
  return errores;
}

export function leerFormularioPago(f: FormData, obligacionId: string): { ok: true; datos: DatosPago } | { ok: false; errores: Record<string, string> } {
  const r = esquemaPago.safeParse({ obligacionId, ...campos(f) });
  return r.success ? { ok: true, datos: r.data } : { ok: false, errores: aErrores(r.error.issues) };
}

export function leerFormularioPagoDirecto(f: FormData): { ok: true; datos: DatosPagoDirecto } | { ok: false; errores: Record<string, string> } {
  const r = esquemaPagoDirecto.safeParse({
    bienId: texto(f, "bienId"),
    conceptoId: texto(f, "conceptoId"),
    responsable: texto(f, "responsable"),
    descripcion: texto(f, "descripcion"),
    moneda: texto(f, "moneda") || undefined,
    ...campos(f),
  });
  return r.success ? { ok: true, datos: r.data } : { ok: false, errores: aErrores(r.error.issues) };
}
