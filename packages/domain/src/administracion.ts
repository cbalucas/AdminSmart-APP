// Datos de la administración (diccionario 18, P-40). Los mensajes de error son claves de `packages/i18n/src/es-AR.json`.
import { z } from "zod";
import { esquemaDatosAdministracion, normalizarCuit } from "./autenticacion";
import { PATRON_ALIAS, esCbuValido } from "./propietarios";

const textoOpcional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null));

const emailOpcional = z
  .string()
  .trim()
  .toLowerCase()
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || z.email().safeParse(v).success, { error: "validacion.email_invalido" });

const cbuOpcional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v.replace(/\s/g, "") : null))
  .refine((v) => v === null || esCbuValido(v), { error: "validacion.cbu_invalido" });

const aliasOpcional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v.toLowerCase() : null))
  .refine((v) => v === null || PATRON_ALIAS.test(v), { error: "validacion.alias_invalido" });

/**
 * P-40. La cuenta de depósito es opcional en conjunto, pero si se carga algo hace falta el titular y
 * el alias o el CBU (alcanza con uno), igual que las cuentas de los propietarios. Sin cuenta cargada el
 * resumen de depósito avisa que faltan los datos.
 */
export const esquemaAdministracion = esquemaDatosAdministracion
  .extend({
    cuentaDepositoBanco: textoOpcional,
    cuentaDepositoTitular: textoOpcional,
    cuentaDepositoCbu: cbuOpcional,
    cuentaDepositoAlias: aliasOpcional,
    emailEnvio: emailOpcional,
  })
  .transform((d) => ({ ...d, cuit: d.cuit ? normalizarCuit(d.cuit) : null }))
  .superRefine((d, ctx) => {
    const hayCuenta = Boolean(d.cuentaDepositoBanco || d.cuentaDepositoTitular || d.cuentaDepositoCbu || d.cuentaDepositoAlias);
    if (!hayCuenta) return;
    if (!d.cuentaDepositoTitular) ctx.addIssue({ code: "custom", path: ["cuentaDepositoTitular"], message: "validacion.titular_obligatorio" });
    if (!d.cuentaDepositoCbu && !d.cuentaDepositoAlias) {
      ctx.addIssue({ code: "custom", path: ["cuentaDepositoAlias"], message: "validacion.alias_o_cbu" });
    }
  });
export type DatosAdministracionCompletos = z.output<typeof esquemaAdministracion>;

/** ¿Está completa la cuenta de depósito para el resumen de depósito? */
export function cuentaDepositoCompleta(c: { titular: string | null; cbu: string | null; alias: string | null }): boolean {
  return Boolean(c.titular && (c.cbu || c.alias));
}

export const TIPOS_MIME_LOGO = ["image/png", "image/jpeg", "image/svg+xml"] as const;
export const MAX_BYTES_LOGO = 2 * 1024 * 1024;

export type ResultadoLogo = { ok: true; formato: "png" | "jpg" | "svg" } | { ok: false; error: "validacion.logo_tipo" | "validacion.logo_tamano" | "validacion.archivo_vacio" };

/** ADM: el logo es PNG, JPG o SVG, de hasta 2 MB. */
export function validarLogo(a: { tipoMime: string; tamano: number }): ResultadoLogo {
  if (!(TIPOS_MIME_LOGO as readonly string[]).includes(a.tipoMime)) return { ok: false, error: "validacion.logo_tipo" };
  if (a.tamano <= 0) return { ok: false, error: "validacion.archivo_vacio" };
  if (a.tamano > MAX_BYTES_LOGO) return { ok: false, error: "validacion.logo_tamano" };
  return { ok: true, formato: a.tipoMime === "image/png" ? "png" : a.tipoMime === "image/jpeg" ? "jpg" : "svg" };
}

/** El PDF dibuja PNG y JPG; un logo SVG se ve en la aplicación pero no sale en los PDF. */
export function logoSaleEnPdf(formato: "png" | "jpg" | "svg"): boolean {
  return formato !== "svg";
}

/** Formato de un logo guardado, según la extensión de su ruta. */
export function formatoDeLogoGuardado(ruta: string): "png" | "jpg" | "svg" | null {
  const ext = ruta.toLowerCase().split(".").pop();
  if (ext === "png") return "png";
  if (ext === "jpg" || ext === "jpeg") return "jpg";
  if (ext === "svg") return "svg";
  return null;
}
