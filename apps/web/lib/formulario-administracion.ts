import { esquemaAdministracion, type DatosAdministracionCompletos } from "@ai/domain";

export interface EstadoFormularioAdministracion {
  /** Clave de texto de cada campo con error (por nombre de campo). */
  errores?: Record<string, string>;
  error?: string;
  guardado?: boolean;
}

const texto = (f: FormData, nombre: string) => String(f.get(nombre) ?? "");

export function leerFormularioAdministracion(
  f: FormData,
): { ok: true; datos: DatosAdministracionCompletos } | { ok: false; errores: Record<string, string> } {
  const r = esquemaAdministracion.safeParse({
    nombre: texto(f, "nombre"),
    cuit: texto(f, "cuit"),
    contactoTelefono: texto(f, "contactoTelefono"),
    contactoEmail: texto(f, "contactoEmail"),
    contactoDireccion: texto(f, "contactoDireccion"),
    cuentaDepositoBanco: texto(f, "cuentaDepositoBanco"),
    cuentaDepositoTitular: texto(f, "cuentaDepositoTitular"),
    cuentaDepositoCbu: texto(f, "cuentaDepositoCbu"),
    cuentaDepositoAlias: texto(f, "cuentaDepositoAlias"),
    emailEnvio: texto(f, "emailEnvio"),
  });
  if (r.success) return { ok: true, datos: r.data };
  const errores: Record<string, string> = {};
  for (const issue of r.error.issues) {
    const campo = String(issue.path[0] ?? "general");
    errores[campo] ??= issue.message.startsWith("validacion.") ? issue.message : "administracion.error_guardar";
  }
  return { ok: false, errores };
}
