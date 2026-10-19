import { esquemaMovimientoManual, esquemaTraspaso, type DatosMovimientoManual, type DatosTraspaso } from "@ai/domain";

export interface EstadoFormularioMovimiento {
  /** Clave de texto de cada campo con error (por nombre de campo). */
  errores?: Record<string, string>;
  error?: string;
  /** MOV-05: el importe supera el saldo disponible; hay que confirmarlo. Trae el saldo ya formateado. */
  avisoExceso?: string;
}

const texto = (f: FormData, nombre: string) => String(f.get(nombre) ?? "");

function aErrores(issues: { path: PropertyKey[]; message: string }[]): Record<string, string> {
  const errores: Record<string, string> = {};
  for (const issue of issues) {
    const campo = String(issue.path[0] ?? "general");
    errores[campo] ??= issue.message.startsWith("validacion.") ? issue.message : "cuentas.error_guardar";
  }
  return errores;
}

export function leerMovimiento(f: FormData): { ok: true; datos: DatosMovimientoManual } | { ok: false; errores: Record<string, string> } {
  const r = esquemaMovimientoManual.safeParse({
    propietarioId: texto(f, "propietarioId"),
    bienId: texto(f, "bienId"),
    tipo: texto(f, "tipo"),
    ajuste: texto(f, "ajuste") || undefined,
    moneda: texto(f, "moneda"),
    fecha: texto(f, "fecha"),
    importe: texto(f, "importe"),
    descripcion: texto(f, "descripcion"),
    confirmarExceso: f.get("confirmarExceso") === "on",
  });
  return r.success ? { ok: true, datos: r.data } : { ok: false, errores: aErrores(r.error.issues) };
}

export function leerTraspaso(f: FormData): { ok: true; datos: DatosTraspaso } | { ok: false; errores: Record<string, string> } {
  const r = esquemaTraspaso.safeParse({
    propietarioId: texto(f, "propietarioId"),
    bienId: texto(f, "bienId"),
    monedaOrigen: texto(f, "monedaOrigen"),
    cotizacion: texto(f, "cotizacion"),
    montoPesos: texto(f, "montoPesos"),
    montoDolares: texto(f, "montoDolares"),
    fecha: texto(f, "fecha"),
    descripcion: texto(f, "descripcion"),
    confirmarExceso: f.get("confirmarExceso") === "on",
  });
  return r.success ? { ok: true, datos: r.data } : { ok: false, errores: aErrores(r.error.issues) };
}
