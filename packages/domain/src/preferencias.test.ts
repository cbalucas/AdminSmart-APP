import { describe, expect, it } from "vitest";
import { esquemaPreferencias, MAX_DIAS_AVISO_RECURRENTES } from "./preferencias";

describe("Preferencias generales", () => {
  it("OBL-08: acepta los días de aviso entre 1 y el máximo", () => {
    expect(esquemaPreferencias.safeParse({ diasAvisoRecurrentes: 5, monedaDefecto: "ARS" }).success).toBe(true);
    expect(esquemaPreferencias.safeParse({ diasAvisoRecurrentes: MAX_DIAS_AVISO_RECURRENTES, monedaDefecto: "USD" }).success).toBe(true);
  });
  it("OBL-08: rechaza cero, negativos, decimales y más del máximo", () => {
    for (const dias of [0, -1, 2.5, MAX_DIAS_AVISO_RECURRENTES + 1]) {
      expect(esquemaPreferencias.safeParse({ diasAvisoRecurrentes: dias, monedaDefecto: "ARS" }).success).toBe(false);
    }
  });
  it("ADM-01: la moneda por defecto es ARS o USD", () => {
    expect(esquemaPreferencias.safeParse({ diasAvisoRecurrentes: 5, monedaDefecto: "EUR" }).success).toBe(false);
  });
});
