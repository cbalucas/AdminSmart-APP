import { describe, expect, it } from "vitest";
import { cuentaDepositoCompleta, esquemaAdministracion, formatoDeLogoGuardado, logoSaleEnPdf, validarLogo } from "./administracion";

const base = { nombre: "LPA Admin" };
const CBU = "0170099220000067797370";

describe("Datos de la administración", () => {
  it("ADM-01: solo el nombre es obligatorio", () => {
    expect(esquemaAdministracion.safeParse(base).success).toBe(true);
    expect(esquemaAdministracion.safeParse({ nombre: "" }).success).toBe(false);
  });
  it("ADM-01: el CUIT, si se carga, debe ser válido y se guarda sin guiones", () => {
    expect(esquemaAdministracion.parse({ ...base, cuit: "20-12345678-6" }).cuit).toBe("20123456786");
    expect(esquemaAdministracion.safeParse({ ...base, cuit: "20-12345678-5" }).success).toBe(false);
  });
  it("ADM-01: el email de contacto y el de envío deben ser válidos", () => {
    expect(esquemaAdministracion.safeParse({ ...base, contactoEmail: "no-es-email" }).success).toBe(false);
    expect(esquemaAdministracion.safeParse({ ...base, emailEnvio: "no-es-email" }).success).toBe(false);
    expect(esquemaAdministracion.parse({ ...base, emailEnvio: "Admin@Ejemplo.com" }).emailEnvio).toBe("admin@ejemplo.com");
  });
  it("ADM-01: sin cuenta de depósito se puede guardar", () => {
    expect(esquemaAdministracion.safeParse(base).success).toBe(true);
  });
  it("ADM-01: si se carga la cuenta, hace falta el titular", () => {
    const r = esquemaAdministracion.safeParse({ ...base, cuentaDepositoAlias: "admin.prueba" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe("validacion.titular_obligatorio");
  });
  it("ADM-01: la cuenta se identifica con el alias o con el CBU: alcanza con uno", () => {
    expect(esquemaAdministracion.safeParse({ ...base, cuentaDepositoTitular: "LPA", cuentaDepositoAlias: "admin.prueba" }).success).toBe(true);
    expect(esquemaAdministracion.safeParse({ ...base, cuentaDepositoTitular: "LPA", cuentaDepositoCbu: CBU }).success).toBe(true);
    const r = esquemaAdministracion.safeParse({ ...base, cuentaDepositoTitular: "LPA", cuentaDepositoBanco: "Banco" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe("validacion.alias_o_cbu");
  });
  it("ADM-01: el banco es opcional", () => {
    expect(esquemaAdministracion.safeParse({ ...base, cuentaDepositoTitular: "LPA", cuentaDepositoAlias: "admin.prueba" }).success).toBe(true);
  });
  it("ADM-01: rechaza un CBU o un alias inválidos", () => {
    expect(esquemaAdministracion.safeParse({ ...base, cuentaDepositoTitular: "LPA", cuentaDepositoCbu: "123" }).success).toBe(false);
    expect(esquemaAdministracion.safeParse({ ...base, cuentaDepositoTitular: "LPA", cuentaDepositoAlias: "a b" }).success).toBe(false);
  });
  it("ADM-01: el alias se guarda en minúsculas", () => {
    expect(esquemaAdministracion.parse({ ...base, cuentaDepositoTitular: "LPA", cuentaDepositoAlias: "Admin.Prueba" }).cuentaDepositoAlias).toBe("admin.prueba");
  });
  it("ADM-01: la cuenta está completa con titular y alias o CBU", () => {
    expect(cuentaDepositoCompleta({ titular: "LPA", cbu: null, alias: "admin.prueba" })).toBe(true);
    expect(cuentaDepositoCompleta({ titular: null, cbu: CBU, alias: null })).toBe(false);
    expect(cuentaDepositoCompleta({ titular: "LPA", cbu: null, alias: null })).toBe(false);
  });
});

describe("Logo de la administración", () => {
  it("ADM-02: acepta PNG, JPG y SVG", () => {
    expect(validarLogo({ tipoMime: "image/png", tamano: 1000 })).toEqual({ ok: true, formato: "png" });
    expect(validarLogo({ tipoMime: "image/jpeg", tamano: 1000 })).toEqual({ ok: true, formato: "jpg" });
    expect(validarLogo({ tipoMime: "image/svg+xml", tamano: 1000 })).toEqual({ ok: true, formato: "svg" });
  });
  it("ADM-02: rechaza otros formatos y tamaños excesivos", () => {
    expect(validarLogo({ tipoMime: "image/gif", tamano: 1000 }).ok).toBe(false);
    expect(validarLogo({ tipoMime: "application/pdf", tamano: 1000 }).ok).toBe(false);
    expect(validarLogo({ tipoMime: "image/png", tamano: 3 * 1024 * 1024 })).toEqual({ ok: false, error: "validacion.logo_tamano" });
    expect(validarLogo({ tipoMime: "image/png", tamano: 0 }).ok).toBe(false);
  });
  it("ADM-02: un logo SVG no sale en los PDF; PNG y JPG sí", () => {
    expect(logoSaleEnPdf("svg")).toBe(false);
    expect(logoSaleEnPdf("png")).toBe(true);
    expect(logoSaleEnPdf("jpg")).toBe(true);
  });
  it("ADM-02: el formato de un logo guardado sale de su extensión", () => {
    expect(formatoDeLogoGuardado("org/logo-1.PNG")).toBe("png");
    expect(formatoDeLogoGuardado("org/logo-1.jpeg")).toBe("jpg");
    expect(formatoDeLogoGuardado("org/logo-1.svg")).toBe("svg");
    expect(formatoDeLogoGuardado("org/logo-1")).toBeNull();
  });
});
