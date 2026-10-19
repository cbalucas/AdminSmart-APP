import { describe, expect, it } from "vitest";
import { imputacionDelBien } from "./bienes";
import { armarResumenDeposito, fechaLimiteDelHorizonte, parteDelPropietario, reposicionDelFondo, type ObligacionParaResumen } from "./resumenDeposito";

const HOY = "2026-10-13";
const ob = (p: Partial<ObligacionParaResumen> & { id: string }): ObligacionParaResumen => ({
  bien: "Dúplex Güemes",
  concepto: "Expensas",
  descripcion: null,
  periodo: "2026-10-01",
  vencimiento: "2026-10-15",
  monto: 6840000,
  moneda: "ARS",
  estado: "pendiente",
  porcentaje: 100,
  ...p,
});

describe("Horizonte del resumen", () => {
  it("RF-24: 30 días desde hoy", () => {
    expect(fechaLimiteDelHorizonte({ tipo: "dias", dias: 30 }, HOY)).toBe("2026-11-12");
  });
  it("RF-24: fin de mes es el último día del mes de hoy, también en febrero", () => {
    expect(fechaLimiteDelHorizonte({ tipo: "fin_de_mes" }, HOY)).toBe("2026-10-31");
    expect(fechaLimiteDelHorizonte({ tipo: "fin_de_mes" }, "2026-02-10")).toBe("2026-02-28");
  });
  it("RF-24: una fecha a elección se respeta", () => {
    expect(fechaLimiteDelHorizonte({ tipo: "fecha", fecha: "2026-12-05" }, HOY)).toBe("2026-12-05");
  });
  it("RF-24: los días cruzan el cambio de año", () => {
    expect(fechaLimiteDelHorizonte({ tipo: "dias", dias: 30 }, "2026-12-20")).toBe("2027-01-19");
  });
});

describe("Monto a depositar", () => {
  const base = { moneda: "ARS" as const, fechaLimite: "2026-11-12", hoy: HOY, fondoReserva: null };
  const obligaciones = [
    ob({ id: "a", monto: 6840000, vencimiento: "2026-10-15" }),
    ob({ id: "b", concepto: "Municipalidad", monto: 2715000, vencimiento: "2026-10-20" }),
    ob({ id: "c", concepto: "Rentas", periodo: "2026-11-01", monto: 5550000, vencimiento: "2026-11-10" }),
  ];
  it("4.5: suma lo pendiente hasta la fecha límite y resta el saldo disponible", () => {
    const r = armarResumenDeposito({ ...base, obligaciones, saldoDisponible: 2000000 });
    expect(r.sumaObligaciones).toBe(15105000);
    expect(r.aDepositar).toBe(13105000);
    expect(r.saldoATransferir).toBe(0);
  });
  it("4.5: no suma lo que vence después de la fecha límite", () => {
    const r = armarResumenDeposito({ ...base, obligaciones: [...obligaciones, ob({ id: "d", vencimiento: "2026-11-13", monto: 100000 })], saldoDisponible: 0 });
    expect(r.sumaObligaciones).toBe(15105000);
  });
  it("RN-04: las vencidas se suman aunque su fecha sea anterior a hoy", () => {
    const r = armarResumenDeposito({ ...base, obligaciones: [ob({ id: "v", vencimiento: "2026-10-01", monto: 100000 })], saldoDisponible: 0 });
    expect(r.aDepositar).toBe(100000);
  });
  it("4.5: si el saldo supera las obligaciones, a depositar es cero y se informa el saldo a transferir", () => {
    const r = armarResumenDeposito({ ...base, obligaciones, saldoDisponible: 20000000 });
    expect(r.aDepositar).toBe(0);
    expect(r.saldoATransferir).toBe(4895000);
  });
  it("MOV-07: un saldo deudor aumenta lo que hay que depositar", () => {
    const r = armarResumenDeposito({ ...base, obligaciones: [ob({ id: "a", monto: 1000000 })], saldoDisponible: -250000 });
    expect(r.aDepositar).toBe(1250000);
  });
  it("RN-14: nunca compensa pesos con dólares", () => {
    const r = armarResumenDeposito({ ...base, obligaciones: [ob({ id: "u", moneda: "USD", monto: 100000 })], saldoDisponible: 5000000 });
    expect(r.sumaObligaciones).toBe(0);
    expect(r.pendientes).toHaveLength(0);
  });
  it("OBL-11: un gasto A completar no suma y figura a confirmar", () => {
    const r = armarResumenDeposito({ ...base, obligaciones: [ob({ id: "x", monto: null, estado: "a_completar", vencimiento: null })], saldoDisponible: 0 });
    expect(r.sumaObligaciones).toBe(0);
    expect(r.aConfirmar.map((o) => o.id)).toEqual(["x"]);
  });
  it("OBL-07: una obligación con monto y sin vencimiento no suma y figura como posible", () => {
    const r = armarResumenDeposito({ ...base, obligaciones: [ob({ id: "p", vencimiento: null, monto: 4500000 })], saldoDisponible: 0 });
    expect(r.sumaObligaciones).toBe(0);
    expect(r.posibles.map((o) => o.id)).toEqual(["p"]);
  });
  it("RN-05: las pagadas y anuladas no entran", () => {
    const r = armarResumenDeposito({ ...base, obligaciones: [ob({ id: "g", estado: "pagada" }), ob({ id: "h", estado: "anulada" })], saldoDisponible: 0 });
    expect(r.sumaObligaciones).toBe(0);
  });
  it("4.5: las pendientes se ordenan por vencimiento", () => {
    const r = armarResumenDeposito({ ...base, obligaciones: [obligaciones[2] as ObligacionParaResumen, obligaciones[0] as ObligacionParaResumen], saldoDisponible: 0 });
    expect(r.pendientes.map((o) => o.id)).toEqual(["a", "c"]);
  });
});

describe("Fondo de reserva", () => {
  it("PRO-09: sin saldo suficiente, repone el fondo completo además de lo pendiente", () => {
    expect(reposicionDelFondo(5000, 10000, 3000)).toBe(3000);
  });
  it("PRO-09: si después de pagar queda menos que el fondo, repone la diferencia", () => {
    expect(reposicionDelFondo(11000, 10000, 3000)).toBe(2000);
  });
  it("PRO-09: si después de pagar queda el fondo o más, no repone", () => {
    expect(reposicionDelFondo(20000, 10000, 3000)).toBe(0);
  });
  it("PRO-09: sin fondo no hay reposición", () => {
    expect(reposicionDelFondo(0, 10000, null)).toBe(0);
  });
  it("PRO-09: el monto a depositar incluye la reposición y el saldo a transferir respeta el fondo", () => {
    const base = { moneda: "ARS" as const, fechaLimite: "2026-11-12", hoy: HOY, fondoReserva: 300000 };
    const faltante = armarResumenDeposito({ ...base, obligaciones: [ob({ id: "a", monto: 1000000 })], saldoDisponible: 1100000 });
    expect(faltante.aDepositar).toBe(200000);
    const sobrante = armarResumenDeposito({ ...base, obligaciones: [ob({ id: "a", monto: 1000000 })], saldoDisponible: 2000000 });
    expect(sobrante.aDepositar).toBe(0);
    expect(sobrante.saldoATransferir).toBe(700000);
  });
});

describe("Parte del propietario", () => {
  const dos = [
    { propietarioId: "a", porcentaje: 50 },
    { propietarioId: "b", porcentaje: 50 },
  ];
  it("CON-02: cada titular absorbe su porcentaje", () => {
    expect(parteDelPropietario(10001, dos, "a")).toBe(5001);
    expect(parteDelPropietario(10001, dos, "b")).toBe(5000);
  });
  it("CON-02: con titularidad parcial la parte no cargada no se imputa a nadie", () => {
    expect(parteDelPropietario(100000, [{ propietarioId: "a", porcentaje: 85 }], "a")).toBe(85000);
  });
  it("CON-02: quien no es titular no tiene parte", () => {
    expect(parteDelPropietario(100000, dos, "z")).toBe(0);
  });
});

describe("Imputación según el modo de liquidación", () => {
  const titulares = [
    { propietarioId: "a", porcentaje: 60, esRepresentante: true },
    { propietarioId: "b", porcentaje: 40, esRepresentante: false },
  ];
  it("CON-02: por separado, cada titular con su porcentaje", () => {
    expect(imputacionDelBien("por_separado", titulares, null)).toEqual([
      { propietarioId: "a", porcentaje: 60 },
      { propietarioId: "b", porcentaje: 40 },
    ]);
  });
  it("CON-04: al representante, todo el movimiento se imputa a su cuenta", () => {
    expect(imputacionDelBien("al_representante", titulares, null)).toEqual([{ propietarioId: "a", porcentaje: 100 }]);
  });
  it("CON-04: a un propietario elegido, todo el movimiento va a su cuenta", () => {
    expect(imputacionDelBien("a_propietario", titulares, "b")).toEqual([{ propietarioId: "b", porcentaje: 100 }]);
  });
  it("CON-04: si el elegido ya no es titular se imputa por separado", () => {
    expect(imputacionDelBien("a_propietario", titulares, "z")).toHaveLength(2);
  });
  it("CON-04: sin representante designado se imputa por separado", () => {
    expect(imputacionDelBien("al_representante", titulares.map((t) => ({ ...t, esRepresentante: false })), null)).toHaveLength(2);
  });
});
