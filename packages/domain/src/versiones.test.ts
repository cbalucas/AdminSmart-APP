import { describe, expect, it } from "vitest";
import { VERSIONES, VERSION_ACTUAL } from "./versiones";

const partes = (v: string) => v.split(".").map(Number) as [number, number, number];

describe("Historial de versiones", () => {
  it("VER-01: cada versión tiene el formato MAYOR.MENOR.PARCHE y una fecha válida", () => {
    for (const v of VERSIONES) {
      expect(v.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(v.fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(v.puntos.length).toBeGreaterThan(0);
    }
  });
  it("VER-02: están ordenadas de la más nueva a la más vieja y sin repetir", () => {
    for (let i = 1; i < VERSIONES.length; i++) {
      const [a1, a2, a3] = partes(VERSIONES[i - 1]!.version);
      const [b1, b2, b3] = partes(VERSIONES[i]!.version);
      expect(a1 * 1e6 + a2 * 1e3 + a3).toBeGreaterThan(b1 * 1e6 + b2 * 1e3 + b3);
    }
  });
  it("VER-03: la versión actual es la primera del historial", () => {
    expect(VERSION_ACTUAL).toBe(VERSIONES[0]!.version);
  });
});
