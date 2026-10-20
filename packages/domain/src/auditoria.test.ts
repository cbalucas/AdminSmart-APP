import { describe, expect, it } from "vitest";
import { cambiosDeCampos, descripcionDelRegistro, formatearValorAuditoria, humanizarCampo } from "./auditoria";

describe("Resumen de la auditoría", () => {
  it("SEG-05: una modificación lista solo los campos que cambiaron", () => {
    const r = cambiosDeCampos({ id: "1", monto: 100, vencimiento: "2026-10-08", version: 1 }, { id: "1", monto: 200, vencimiento: "2026-10-08", version: 2 });
    expect(r).toEqual([{ campo: "monto", antes: 100, despues: 200 }]);
  });
  it("SEG-05: no muestra los campos internos de sistema", () => {
    const r = cambiosDeCampos({ organizacion_id: "a", updated_at: "x", version: 1 }, { organizacion_id: "b", updated_at: "y", version: 2 });
    expect(r).toEqual([]);
  });
  it("SEG-05: un alta lista los campos cargados y deja afuera los vacíos", () => {
    const r = cambiosDeCampos(null, { id: "1", alias: "Dpto Caseros", calle: null, observaciones: "", es_gastos_varios: false });
    expect(r.map((c) => c.campo)).toEqual(["alias"]);
  });
  it("SEG-05: en un alta se muestran primero los datos que identifican el registro y no los importes en cero", () => {
    const r = cambiosDeCampos(null, { bien_id: "x", debe: 0, haber: 150000, descripcion: "Depósito", tipo: "deposito_propietario", moneda: "ARS" });
    expect(r.map((c) => c.campo)).toEqual(["descripcion", "tipo", "haber", "moneda", "bien_id"]);
  });
  it("SEG-05: una anulación aparece como el cambio de su marca", () => {
    const r = cambiosDeCampos({ anulado: false, anulacion_motivo: null }, { anulado: true, anulacion_motivo: "Duplicado" });
    expect(r.map((c) => c.campo).sort()).toEqual(["anulacion_motivo", "anulado"]);
  });
  it("SEG-05: un campo nuevo o quitado también es un cambio", () => {
    expect(cambiosDeCampos({ a: 1 }, { a: 1, b: 2 })).toEqual([{ campo: "b", antes: null, despues: 2 }]);
    expect(cambiosDeCampos({ a: 1, b: 2 }, { a: 1 })).toEqual([{ campo: "b", antes: 2, despues: null }]);
  });

  it("RN-06: los importes en centavos se muestran en su moneda", () => {
    expect(formatearValorAuditoria("monto", 4130000, "ARS")).toBe("$ 41.300");
    expect(formatearValorAuditoria("haber", 10000, "USD")).toBe("US$ 100");
  });
  it("SEG-05: fechas, sí/no, vacíos e identificadores se muestran legibles", () => {
    expect(formatearValorAuditoria("vencimiento", "2026-10-08")).toBe("08/10/2026");
    expect(formatearValorAuditoria("anulado", true)).toBe("Sí");
    expect(formatearValorAuditoria("anulado", false)).toBe("No");
    expect(formatearValorAuditoria("descripcion", null)).toBe("—");
    expect(formatearValorAuditoria("bien_id", "01a1544b-4c77-729a-9711-8618e9b94699")).toBe("01a1544b…");
    expect(formatearValorAuditoria("emails", [{ email: "a@b.c" }])).toBe('[{"email":"a@b.c"}]');
  });
  it("SEG-05: una fecha con hora se muestra en la hora de Córdoba", () => {
    expect(formatearValorAuditoria("anulacion_fecha", "2026-10-20T15:00:00.000Z")).toMatch(/20\/10\/26.*12:00/);
  });
  it("SEG-05: un número que no es un importe se muestra tal cual", () => {
    expect(formatearValorAuditoria("dia_vencimiento", 15)).toBe("15");
  });

  it("SEG-05: un registro se nombra por su alias, nombre o número", () => {
    expect(descripcionDelRegistro({ alias: "Dpto Caseros" })).toBe("Dpto Caseros");
    expect(descripcionDelRegistro({ nombre_razon_social: "Carlos", alias: "x" })).toBe("Carlos");
    expect(descripcionDelRegistro({ numero: "DEP-2026-0001" })).toBe("DEP-2026-0001");
    expect(descripcionDelRegistro({ monto: 1 })).toBe("");
    expect(descripcionDelRegistro(null)).toBe("");
  });
  it("SEG-05: un campo sin texto propio se muestra sin guiones bajos", () => {
    expect(humanizarCampo("dia_vencimiento")).toBe("dia vencimiento");
  });
});
