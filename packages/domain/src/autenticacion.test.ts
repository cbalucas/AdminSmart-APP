import { describe, expect, it } from "vitest";
import {
  esCuitValido,
  esEmail,
  esNombreUsuarioValido,
  esquemaDatosAdministracion,
  esquemaIngreso,
  esquemaNuevaContrasena,
  esquemaPrimerAdministrador,
  esquemaRecuperacion,
  normalizarCuit,
} from "./autenticacion";

const clavesDeError = (resultado: { success: boolean; error?: { issues: { message: string }[] } }) =>
  resultado.error?.issues.map((i) => i.message) ?? [];

describe("ADM-01: CUIT de la administración", () => {
  it("ADM-01: acepta un CUIT con dígito verificador correcto, con o sin guiones", () => {
    expect(esCuitValido("20-12345678-6")).toBe(true);
    expect(esCuitValido("20123456786")).toBe(true);
  });

  it("ADM-01: rechaza un CUIT con dígito verificador incorrecto", () => {
    expect(esCuitValido("20-12345678-5")).toBe(false);
  });

  it("ADM-01: rechaza un CUIT con largo distinto de 11 dígitos", () => {
    expect(esCuitValido("2012345678")).toBe(false);
    expect(esCuitValido("201234567866")).toBe(false);
    expect(esCuitValido("")).toBe(false);
  });

  it("ADM-01: normaliza quitando todo lo que no es dígito", () => {
    expect(normalizarCuit("20-12345678-6")).toBe("20123456786");
  });
});

describe("P-02: ingreso", () => {
  it("P-02: normaliza el email (espacios y mayúsculas)", () => {
    const r = esquemaIngreso.safeParse({ identificador: "  Lucas@Ejemplo.COM ", contrasena: "x" });
    expect(r.success && r.data.identificador).toBe("lucas@ejemplo.com");
  });

  it("P-02: acepta un nombre de usuario en lugar del email", () => {
    const r = esquemaIngreso.safeParse({ identificador: " Demo ", contrasena: "x" });
    expect(r.success && r.data.identificador).toBe("demo");
    expect(esEmail("demo")).toBe(false);
    expect(esEmail("demo@ejemplo.com")).toBe(true);
  });

  it("P-02: un email mal escrito (con arroba) devuelve la clave de error del email", () => {
    const r = esquemaIngreso.safeParse({ identificador: "lucas@", contrasena: "x" });
    expect(clavesDeError(r)).toContain("validacion.email_invalido");
  });

  it("P-02: el identificador vacío devuelve su clave de error", () => {
    const r = esquemaIngreso.safeParse({ identificador: "  ", contrasena: "x" });
    expect(clavesDeError(r)).toContain("validacion.identificador_obligatorio");
  });

  it("P-02: la contraseña vacía devuelve su clave de error", () => {
    const r = esquemaIngreso.safeParse({ identificador: "a@b.com", contrasena: "" });
    expect(clavesDeError(r)).toContain("validacion.contrasena_obligatoria");
  });

  it("USU-01: el nombre de usuario admite minúsculas, números, punto, guion y guion bajo (3 a 30)", () => {
    expect(esNombreUsuarioValido("demo")).toBe(true);
    expect(esNombreUsuarioValido("lucas.paez_2")).toBe(true);
    expect(esNombreUsuarioValido("ab")).toBe(false);
    expect(esNombreUsuarioValido("Demo")).toBe(false);
    expect(esNombreUsuarioValido("con espacio")).toBe(false);
    expect(esNombreUsuarioValido("a@b.com")).toBe(false);
  });
});

describe("USU-10: nueva contraseña", () => {
  it("USU-10: exige un largo mínimo", () => {
    const r = esquemaNuevaContrasena.safeParse({ contrasena: "corta", confirmacion: "corta" });
    expect(clavesDeError(r)).toContain("validacion.contrasena_corta");
  });

  it("USU-10: exige que la confirmación coincida", () => {
    const r = esquemaNuevaContrasena.safeParse({ contrasena: "una-clave-larga", confirmacion: "otra-clave-larga" });
    expect(clavesDeError(r)).toContain("validacion.contrasenas_distintas");
  });

  it("USU-10: acepta una contraseña válida y confirmada", () => {
    expect(esquemaNuevaContrasena.safeParse({ contrasena: "una-clave-larga", confirmacion: "una-clave-larga" }).success).toBe(true);
  });

  it("USU-10: el email de recuperación se valida igual que el de ingreso", () => {
    expect(esquemaRecuperacion.safeParse({ email: "no-es-email" }).success).toBe(false);
    expect(esquemaRecuperacion.safeParse({ email: "a@b.com" }).success).toBe(true);
  });
});

describe("ADM-01: configuración inicial", () => {
  it("ADM-01: el nombre de la administración es obligatorio", () => {
    const r = esquemaDatosAdministracion.safeParse({ nombre: "   " });
    expect(clavesDeError(r)).toContain("validacion.nombre_obligatorio");
  });

  it("ADM-01: CUIT, teléfono, email y dirección de contacto son opcionales", () => {
    const r = esquemaDatosAdministracion.safeParse({ nombre: "Administración Pérez" });
    expect(r.success).toBe(true);
  });

  it("ADM-01: si se carga un CUIT inválido, se rechaza", () => {
    const r = esquemaDatosAdministracion.safeParse({ nombre: "A", cuit: "20-12345678-5" });
    expect(clavesDeError(r)).toContain("validacion.cuit_invalido");
  });

  it("ADM-01: si se carga un email de contacto mal escrito, se rechaza", () => {
    const r = esquemaDatosAdministracion.safeParse({ nombre: "A", contactoEmail: "mal" });
    expect(clavesDeError(r)).toContain("validacion.email_invalido");
  });

  it("USU-02: el primer administrador necesita nombre, email y contraseña válidos", () => {
    expect(esquemaPrimerAdministrador.safeParse({ nombre: "Lucas", email: "l@x.com", contrasena: "una-clave-larga" }).success).toBe(true);
    expect(esquemaPrimerAdministrador.safeParse({ nombre: "", email: "l@x.com", contrasena: "una-clave-larga" }).success).toBe(false);
    expect(esquemaPrimerAdministrador.safeParse({ nombre: "Lucas", email: "l@x.com", contrasena: "corta" }).success).toBe(false);
  });
});
