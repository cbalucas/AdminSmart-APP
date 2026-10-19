import { describe, expect, it } from "vitest";
import { formatearPeriodo, periodoDeFecha, puedeModificarObligacion, siguienteAGenerar } from "./obligaciones";

describe("Períodos de obligaciones", () => {
  it("OBL-05: el período de una fecha es el primer día de su mes", () => {
    expect(periodoDeFecha("2026-10-19")).toBe("2026-10-01");
  });
  it("OBL-05: el período se muestra como mes abreviado y año", () => {
    expect(formatearPeriodo("2026-10-01")).toBe("oct 2026");
    expect(formatearPeriodo("2027-01-01")).toBe("ene 2027");
  });
});

describe("Edición de obligaciones", () => {
  it("OBL-06: una obligación pagada no se modifica", () => {
    expect(puedeModificarObligacion({ pagada: true, anulada: false })).toBe(false);
  });
  it("OBL-06: una obligación anulada no se modifica", () => {
    expect(puedeModificarObligacion({ pagada: false, anulada: true })).toBe(false);
  });
  it("OBL-06: una obligación pendiente se puede modificar", () => {
    expect(puedeModificarObligacion({ pagada: false, anulada: false })).toBe(true);
  });
});

describe("Generación de la ocurrencia siguiente", () => {
  const base = { periodo: "2026-10-01", esRecurrente: true, frecuencia: "mensual" as const, anulada: false };
  it("OBL-09: genera la siguiente cuando el período ya comenzó", () => {
    expect(siguienteAGenerar(base, ["2026-10-01"], "2026-10-19")).toBe("2026-11-01");
  });
  it("OBL-09: no genera si ya existe la siguiente", () => {
    expect(siguienteAGenerar(base, ["2026-10-01", "2026-11-01"], "2026-10-19")).toBeNull();
  });
  it("OBL-09: una ocurrencia futura todavía no genera otra", () => {
    expect(siguienteAGenerar({ ...base, periodo: "2026-11-01" }, ["2026-11-01"], "2026-10-19")).toBeNull();
  });
  it("OBL-09: al comenzar su período la ocurrencia futura genera la que sigue", () => {
    expect(siguienteAGenerar({ ...base, periodo: "2026-11-01" }, ["2026-11-01"], "2026-11-02")).toBe("2026-12-01");
  });
  it("OBL-05: respeta la frecuencia bimestral", () => {
    expect(siguienteAGenerar({ ...base, frecuencia: "bimestral" }, [], "2026-10-19")).toBe("2026-12-01");
  });
  it("OBL-10: una obligación no recurrente no genera otra", () => {
    expect(siguienteAGenerar({ ...base, esRecurrente: false }, [], "2026-10-19")).toBeNull();
  });
  it("OBL-10: una obligación anulada no genera otra", () => {
    expect(siguienteAGenerar({ ...base, anulada: true }, [], "2026-10-19")).toBeNull();
  });
});
