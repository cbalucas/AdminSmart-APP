import { describe, expect, it } from "vitest";
import {
  esAliasValido,
  esCbuValido,
  esquemaCuentaBancaria,
  esquemaPropietario,
  hayNombreDuplicado,
  impedimentosDeBaja,
  normalizarNombre,
} from "./propietarios";
import { esUuid, generarUuidV7 } from "./uuid";

const base = {
  nombre: "Carlos José Paez Allende",
  telefonos: [{ tipo: "celular", numero: "+54 351 555-0000" }],
  emails: [{ email: "Carlos@Ejemplo.com", principal: true }],
};
const mensajes = (r: { success: boolean; error?: { issues: { message: string }[] } }) =>
  r.error?.issues.map((i) => i.message) ?? [];

describe("Claves primarias: UUID v7 generado en el cliente", () => {
  it("5.1: tiene formato UUID con versión 7 y variante RFC", () => {
    const id = generarUuidV7();
    expect(esUuid(id)).toBe(true);
    expect(id[14]).toBe("7");
    expect("89ab").toContain(id[19]);
  });
  it("5.1: los UUID generados más tarde ordenan después", () => {
    const a = generarUuidV7(1_000_000_000_000);
    const b = generarUuidV7(1_000_000_000_001);
    expect(a < b).toBe(true);
  });
  it("5.1: no se repiten", () => {
    const ids = new Set(Array.from({ length: 1000 }, () => generarUuidV7()));
    expect(ids.size).toBe(1000);
  });
  it("5.1: codifica la marca de tiempo en los primeros 48 bits", () => {
    const id = generarUuidV7(0x018f_1234_5678);
    expect(id.replace(/-/g, "").slice(0, 12)).toBe("018f12345678");
  });
});

describe("PRO-04 / diccionario 1: alta de propietario", () => {
  it("diccionario 1: acepta los datos mínimos y completa los valores por defecto", () => {
    const r = esquemaPropietario.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.tipoPersona).toBe("humana");
      expect(r.data.horizonteResumenDias).toBe(30);
      expect(r.data.periodicidadLiquidacion).toBe("mensual");
      expect(r.data.idiomaInformes).toBe("es");
      expect(r.data.emails[0]!.email).toBe("carlos@ejemplo.com");
    }
  });
  it("diccionario 1: el nombre es obligatorio", () => {
    expect(mensajes(esquemaPropietario.safeParse({ ...base, nombre: "  " }))).toContain("validacion.nombre_obligatorio");
  });
  it("diccionario 1: exige al menos un teléfono y un email", () => {
    expect(mensajes(esquemaPropietario.safeParse({ ...base, telefonos: [] }))).toContain("validacion.telefono_obligatorio");
    expect(mensajes(esquemaPropietario.safeParse({ ...base, emails: [] }))).toContain("validacion.email_obligatorio");
  });
  it("PRO-04: exige exactamente un email principal", () => {
    const dos = [{ email: "a@a.com", principal: true }, { email: "b@b.com", principal: true }];
    const ninguno = [{ email: "a@a.com", principal: false }];
    expect(mensajes(esquemaPropietario.safeParse({ ...base, emails: dos }))).toContain("validacion.email_principal");
    expect(mensajes(esquemaPropietario.safeParse({ ...base, emails: ninguno }))).toContain("validacion.email_principal");
  });
  it("diccionario 1: el fondo de reserva se guarda en centavos", () => {
    const r = esquemaPropietario.safeParse({ ...base, fondoReservaArs: "50.000,50", fondoReservaUsd: "" });
    expect(r.success && r.data.fondoReservaArs).toBe(5000050);
    expect(r.success && r.data.fondoReservaUsd).toBeNull();
  });
  it("diccionario 1: rechaza un fondo de reserva mal escrito", () => {
    expect(mensajes(esquemaPropietario.safeParse({ ...base, fondoReservaArs: "mucho" }))).toContain("validacion.importe_invalido");
  });
  it("diccionario 1: el horizonte debe ser positivo y el día de liquidación va de 1 a 31", () => {
    expect(esquemaPropietario.safeParse({ ...base, horizonteResumenDias: 0 }).success).toBe(false);
    expect(esquemaPropietario.safeParse({ ...base, diaLiquidacion: 32 }).success).toBe(false);
    expect(esquemaPropietario.safeParse({ ...base, diaLiquidacion: 5 }).success).toBe(true);
  });
});

describe("PRO-01: nombres duplicados", () => {
  it("PRO-01: ignora tildes, mayúsculas y espacios repetidos", () => {
    expect(normalizarNombre("  Carlos  JOSÉ ")).toBe("carlos jose");
    expect(hayNombreDuplicado("carlos jose paez allende", ["Carlos José Paez  Allende"])).toBe(true);
  });
  it("PRO-01: distingue nombres distintos", () => {
    expect(hayNombreDuplicado("Lucas Paez Allende", ["Carlos José Paez Allende"])).toBe(false);
  });
});

describe("PRO-02: baja de propietario", () => {
  const limpio = { bienesActivos: 0, obligacionesPendientes: 0, saldoArs: 0, saldoUsd: 0 };
  it("PRO-02: sin impedimentos se puede dar de baja", () => {
    expect(impedimentosDeBaja(limpio)).toEqual([]);
  });
  it("PRO-02: bienes, obligaciones y saldo (en cualquier moneda) lo impiden", () => {
    expect(impedimentosDeBaja({ ...limpio, bienesActivos: 1 })).toEqual(["bienes"]);
    expect(impedimentosDeBaja({ ...limpio, obligacionesPendientes: 2 })).toEqual(["obligaciones"]);
    expect(impedimentosDeBaja({ ...limpio, saldoUsd: -5 })).toEqual(["saldo"]);
    expect(impedimentosDeBaja({ bienesActivos: 1, obligacionesPendientes: 1, saldoArs: 10, saldoUsd: 0 })).toHaveLength(3);
  });
});

// Se calcula un CBU de ejemplo con los dos dígitos verificadores correctos.
function construirCbu(base20: string): string {
  const v = (d: string, p: number[]) => (10 - (p.reduce((a, x, i) => a + x * Number(d[i]), 0) % 10)) % 10;
  const b1 = base20.slice(0, 7);
  const b2 = base20.slice(7, 20);
  return `${b1}${v(b1, [7, 1, 3, 9, 7, 1, 3])}${b2}${v(b2, [3, 9, 7, 1, 3, 9, 7, 1, 3, 9, 7, 1, 3])}`;
}

describe("diccionario 1.1: cuenta bancaria", () => {
  const cbu = construirCbu("0170009" + "2000000012345");
  it("diccionario 1.1: acepta un CBU con dígitos verificadores correctos", () => {
    expect(cbu).toHaveLength(22);
    expect(esCbuValido(cbu)).toBe(true);
    expect(esCbuValido(cbu.replace(/(\d{4})/g, "$1 "))).toBe(true);
  });
  it("diccionario 1.1: rechaza un CBU con un dígito cambiado o de largo incorrecto", () => {
    const roto = cbu.slice(0, 10) + String((Number(cbu[10]) + 1) % 10) + cbu.slice(11);
    expect(esCbuValido(roto)).toBe(false);
    expect(esCbuValido(cbu.slice(0, 21))).toBe(false);
    expect(esCbuValido("")).toBe(false);
  });
  it("diccionario 1.1: valida y normaliza la cuenta completa", () => {
    const r = esquemaCuentaBancaria.safeParse({
      banco: "Banco Ejemplo", tipoCuenta: "caja_ahorro", cbuCvu: cbu, titular: "Carlos José Paez Allende", alias: "",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.moneda).toBe("ARS");
      expect(r.data.alias).toBeNull();
    }
  });
  it("diccionario 1.1: alcanza con el alias, sin CBU", () => {
    const r = esquemaCuentaBancaria.safeParse({
      banco: "Mercado Pago", tipoCuenta: "billetera", cbuCvu: "", alias: "Carlos.Paez.MP", titular: "Carlos José Paez Allende",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.cbuCvu).toBeNull();
      expect(r.data.alias).toBe("carlos.paez.mp");
    }
  });
  it("diccionario 1.1: alcanza con el CBU, sin alias", () => {
    const r = esquemaCuentaBancaria.safeParse({ banco: "B", tipoCuenta: "caja_ahorro", cbuCvu: cbu, alias: "", titular: "T" });
    expect(r.success).toBe(true);
  });
  it("diccionario 1.1: exige al menos el alias o el CBU", () => {
    const r = esquemaCuentaBancaria.safeParse({ banco: "B", tipoCuenta: "caja_ahorro", cbuCvu: "", alias: "", titular: "T" });
    expect(mensajes(r)).toEqual(["validacion.cuenta_cbu_o_alias"]);
  });
  it("diccionario 1.1: el alias lleva de 6 a 20 caracteres entre letras, números, punto y guion", () => {
    expect(esAliasValido("mi.alias-01")).toBe(true);
    expect(esAliasValido("corto")).toBe(false);
    expect(esAliasValido("esteAliasEsDemasiadoLargo")).toBe(false);
    expect(esAliasValido("con espacio")).toBe(false);
    expect(esAliasValido("con_guion_bajo")).toBe(false);
  });
  it("diccionario 1.1: el titular es obligatorio", () => {
    const r = esquemaCuentaBancaria.safeParse({ banco: "", tipoCuenta: "caja_ahorro", cbuCvu: cbu, titular: "" });
    expect(mensajes(r)).toEqual(["validacion.nombre_obligatorio"]);
  });
  it("diccionario 1.1: el nombre del banco o billetera es opcional", () => {
    const r = esquemaCuentaBancaria.safeParse({ banco: "", tipoCuenta: "billetera", cbuCvu: "", alias: "carlos.paez.mp", titular: "T" });
    expect(r.success && r.data.banco).toBeNull();
  });
});
