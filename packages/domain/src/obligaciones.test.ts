import { describe, expect, it } from "vitest";
import { enVentanaDeFinDeMes, esquemaObligacion, pendientesDeLaVentana, periodoDelMesSiguiente, formatearPeriodo, periodoDeFecha, puedeModificarObligacion, siguienteAGenerar } from "./obligaciones";

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

describe("Alta de obligación", () => {
  const valida = { bienId: "b", bienServicioId: "s", conceptoId: "c", periodo: "2026-10", responsable: "propietario" };
  it("OBL-05: el período se guarda como primer día del mes y el monto puede quedar vacío", () => {
    const r = esquemaObligacion.parse(valida);
    expect(r.periodo).toBe("2026-10-01");
    expect(r.monto).toBeNull();
  });
  it("OBL-04: un gasto suelto exige descripción", () => {
    const r = esquemaObligacion.safeParse({ ...valida, bienServicioId: "" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe("validacion.descripcion_obligatoria");
  });
  it("OBL-04: un gasto suelto con descripción es válido", () => {
    expect(esquemaObligacion.safeParse({ ...valida, bienServicioId: "", descripcion: "Reparación de calefón" }).success).toBe(true);
  });
  it("OBL-05: una obligación recurrente exige frecuencia", () => {
    expect(esquemaObligacion.safeParse({ ...valida, esRecurrente: true }).success).toBe(false);
    expect(esquemaObligacion.safeParse({ ...valida, esRecurrente: true, frecuencia: "mensual" }).success).toBe(true);
  });
  it("OBL-05: el monto se guarda en centavos", () => {
    expect(esquemaObligacion.parse({ ...valida, monto: "41.300,50" }).monto).toBe(4130050);
  });
  it("OBL-05: rechaza un monto no válido o en cero", () => {
    expect(esquemaObligacion.safeParse({ ...valida, monto: "abc" }).success).toBe(false);
    expect(esquemaObligacion.safeParse({ ...valida, monto: "0" }).success).toBe(false);
  });
  it("OBL-05: rechaza un período mal escrito", () => {
    expect(esquemaObligacion.safeParse({ ...valida, periodo: "2026-13" }).success).toBe(false);
  });
});

describe("Ventana de fin de mes", () => {
  it("OBL-08: aparece en los últimos 5 días del mes", () => {
    expect(enVentanaDeFinDeMes("2026-10-27", 5)).toBe(true);
    expect(enVentanaDeFinDeMes("2026-10-31", 5)).toBe(true);
  });
  it("OBL-08: no aparece antes de los últimos 5 días", () => {
    expect(enVentanaDeFinDeMes("2026-10-26", 5)).toBe(false);
  });
  it("OBL-08: respeta los días de aviso configurados y los meses cortos", () => {
    expect(enVentanaDeFinDeMes("2026-02-24", 5)).toBe(true);
    expect(enVentanaDeFinDeMes("2026-02-23", 5)).toBe(false);
    expect(enVentanaDeFinDeMes("2026-10-29", 3)).toBe(true);
    expect(enVentanaDeFinDeMes("2026-10-28", 3)).toBe(false);
  });
  it("OBL-08: el período de la ventana es el mes siguiente, también en diciembre", () => {
    expect(periodoDelMesSiguiente("2026-10-30")).toBe("2026-11-01");
    expect(periodoDelMesSiguiente("2026-12-30")).toBe("2027-01-01");
  });
  it("OBL-08, OBL-11: pide las A completar del mes siguiente y las anteriores sin monto, no las pagadas ni las de más adelante", () => {
    const lista = [
      { id: "a", periodo: "2026-11-01", estado: "a_completar" as const },
      { id: "b", periodo: "2026-10-01", estado: "a_completar" as const },
      { id: "c", periodo: "2026-11-01", estado: "pendiente" as const },
      { id: "d", periodo: "2026-12-01", estado: "a_completar" as const },
      { id: "e", periodo: "2026-11-01", estado: "pagada" as const },
    ];
    expect(pendientesDeLaVentana(lista, "2026-10-28").map((o) => o.id)).toEqual(["a", "b"]);
  });
});
