// Validaciones de ingreso, recuperación de contraseña y configuración inicial.
// Los mensajes de error son claves de `packages/i18n/es-AR.json`, no textos: cada pantalla
// los traduce con `t(clave)`.
import { z } from "zod";

// Largo mínimo de la contraseña. La especificación no fija una política: se adopta 8 caracteres.
export const LARGO_MINIMO_CONTRASENA = 8;

// CUIT/CUIL: 11 dígitos con dígito verificador (módulo 11).
export function normalizarCuit(valor: string): string {
  return valor.replace(/\D/g, "");
}

export function esCuitValido(valor: string): boolean {
  const cuit = normalizarCuit(valor);
  if (cuit.length !== 11) return false;
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const suma = pesos.reduce((acumulado, peso, i) => acumulado + peso * Number(cuit[i]), 0);
  const resto = suma % 11;
  const digito = resto === 0 ? 0 : 11 - resto;
  // El dígito 10 no existe: un CUIT que lo requiere no es válido.
  return digito !== 10 && digito === Number(cuit[10]);
}

const textoObligatorio = (clave: string) => z.string().trim().min(1, { error: clave });
const textoOpcional = z
  .string()
  .trim()
  .optional()
  .transform((valor) => (valor ? valor : undefined));

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "validacion.email_invalido" }));

const contrasenaNueva = z
  .string()
  .min(LARGO_MINIMO_CONTRASENA, { error: "validacion.contrasena_corta" });

// Nombre de usuario (opcional): alternativa al email para ingresar. Minúsculas, números, punto,
// guion y guion bajo; de 3 a 30 caracteres.
export const PATRON_NOMBRE_USUARIO = /^[a-z0-9._-]{3,30}$/;

export function esNombreUsuarioValido(valor: string): boolean {
  return PATRON_NOMBRE_USUARIO.test(valor);
}

// En el ingreso se escribe el email o el nombre de usuario: si lleva arroba es un email.
export const esEmail = (identificador: string) => identificador.includes("@");

const identificador = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, { error: "validacion.identificador_obligatorio" })
  .refine((valor) => !esEmail(valor) || z.email().safeParse(valor).success, {
    error: "validacion.email_invalido",
  });

// P-02 Ingreso
export const esquemaIngreso = z.object({
  identificador,
  contrasena: z.string().min(1, { error: "validacion.contrasena_obligatoria" }),
});

// P-04 Recuperar contraseña, paso 1
export const esquemaRecuperacion = z.object({ email });

// P-04 Recuperar contraseña, paso 3, y P-46 cambio de contraseña
export const esquemaNuevaContrasena = z
  .object({
    contrasena: contrasenaNueva,
    confirmacion: z.string(),
  })
  .refine((datos) => datos.contrasena === datos.confirmacion, {
    error: "validacion.contrasenas_distintas",
    path: ["confirmacion"],
  });

// P-06 Configuración inicial: datos de la administración (objeto 18 del diccionario).
export const esquemaDatosAdministracion = z.object({
  nombre: textoObligatorio("validacion.nombre_obligatorio"),
  cuit: textoOpcional.refine((valor) => valor === undefined || esCuitValido(valor), {
    error: "validacion.cuit_invalido",
  }),
  contactoTelefono: textoOpcional,
  contactoEmail: z
    .string()
    .trim()
    .toLowerCase()
    .optional()
    .transform((valor) => (valor ? valor : undefined))
    .refine((valor) => valor === undefined || z.email().safeParse(valor).success, {
      error: "validacion.email_invalido",
    }),
  contactoDireccion: textoOpcional,
});

// P-06 Configuración inicial: primer administrador. Con cuenta de Google no lleva contraseña.
export const esquemaPrimerAdministrador = z.object({
  nombre: textoObligatorio("validacion.nombre_obligatorio"),
  email,
  contrasena: contrasenaNueva,
});

export type DatosIngreso = z.infer<typeof esquemaIngreso>;
export type DatosAdministracion = z.infer<typeof esquemaDatosAdministracion>;
export type DatosPrimerAdministrador = z.infer<typeof esquemaPrimerAdministrador>;
