import { describe, expect, it } from "vitest";
import { calcularPagoPromedio, calcularSaldo, contramovimiento, transferenciaExcedeSaldo } from "./cuentaCorriente";
import {
  aCentavos,
  formatearFecha,
  formatearImporte,
  parteSinAsignar,
  repartirPorPorcentaje,
  sumarImportes,
} from "./dinero";
import {
  calcularMontoADepositar,
  estadoObligacion,
  impactoDelPago,
  proximoPeriodo,
  resolverResponsable,
  validarPago,
  type ObligacionPendiente,
} from "./obligaciones";

describe("RN-06: importes en centavos", () => {
  it("RN-06: formatea es-AR sin centavos cuando son cero", () => {
    expect(formatearImporte(4130000, "ARS")).toBe("$ 41.300");
    expect(formatearImporte(125000, "USD")).toBe("US$ 1.250");
  });
  it("RN-06: formatea con coma decimal cuando hay centavos", () => {
    expect(formatearImporte(4130050, "ARS")).toBe("$ 41.300,50");
    expect(formatearImporte(5, "ARS")).toBe("$ 0,05");
  });
  it("RN-06: convierte texto es-AR a centavos sin errores de redondeo", () => {
    expect(aCentavos("41.300,50")).toBe(4130050);
    expect(aCentavos("0,1")).toBe(10);
    expect(aCentavos("19,99")).toBe(1999);
    expect(aCentavos("abc")).toBeNull();
    expect(aCentavos("1,234")).toBeNull();
  });
  it("RN-06: rechaza importes con decimales", () => {
    expect(() => formatearImporte(10.5, "ARS")).toThrow();
  });
  it("RN-06: formatea la fecha como 14/10/2026", () => {
    expect(formatearFecha("2026-10-14")).toBe("14/10/2026");
  });
});

describe("RN-14: pesos y dólares nunca se compensan", () => {
  it("RN-14: suma importes de la misma moneda", () => {
    expect(sumarImportes([{ centavos: 100, moneda: "ARS" }, { centavos: 250, moneda: "ARS" }], "ARS")).toBe(350);
  });
  it("RN-14: falla si se mezclan monedas", () => {
    expect(() => sumarImportes([{ centavos: 100, moneda: "ARS" }, { centavos: 1, moneda: "USD" }], "ARS")).toThrow(
      /RN-14/,
    );
  });
});

describe("CON-01: reparto de condominio por porcentaje", () => {
  it("CON-01: reparte 50/50 exacto", () => {
    expect(repartirPorPorcentaje(10000, [50, 50])).toEqual([5000, 5000]);
  });
  it("CON-01: la suma de las partes es siempre el total (tercios)", () => {
    const partes = repartirPorPorcentaje(10000, [33.3333, 33.3333, 33.3334]);
    expect(partes.reduce((a, b) => a + b, 0)).toBe(10000);
  });
  it("CON-01: el centavo sobrante va a quien tiene mayor resto", () => {
    expect(repartirPorPorcentaje(101, [50, 50])).toEqual([51, 50]);
  });
  it("CON-01: rechaza porcentajes que suman más de 100 %", () => {
    expect(() => repartirPorPorcentaje(1000, [60, 50])).toThrow(/CON-01/);
  });
  it("CON-01: acepta porcentajes que suman menos de 100 %: cada titular paga solo su parte", () => {
    // Caseros: 50 % + 25 % + 10 % = 85 %; el 15 % restante no está cargado.
    expect(repartirPorPorcentaje(100000, [50, 25, 10])).toEqual([50000, 25000, 10000]);
    expect(parteSinAsignar(100000, [50, 25, 10])).toBe(15000);
  });
  it("CON-01: un solo titular con menos de 100 % paga solo su parte", () => {
    expect(repartirPorPorcentaje(100000, [40])).toEqual([40000]);
  });
  it("CON-01: la parte asignada se reparte sin perder centavos cuando no suma 100 %", () => {
    const partes = repartirPorPorcentaje(1001, [33.3333, 33.3333]);
    expect(partes.reduce((a, b) => a + b, 0)).toBe(Math.round(1001 * 0.666666));
  });
  it("CON-01: cada porcentaje debe ser mayor a cero", () => {
    expect(() => repartirPorPorcentaje(1000, [100, 0])).toThrow(/CON-01/);
  });
  it("CON-01: con el 100 % cargado no queda nada sin asignar", () => {
    expect(parteSinAsignar(101, [50, 50])).toBe(0);
  });
  it("CON-01: un contramovimiento negativo reparte con signo", () => {
    expect(repartirPorPorcentaje(-101, [50, 50])).toEqual([-51, -50]);
  });
});

describe("RN-04 / RN-05 / OBL-02 / OBL-11: estado de la obligación", () => {
  const base = { monto: 100000, vencimiento: "2026-10-10", pagada: false, anulada: false };
  it("RN-04: pasa a Vencida si el vencimiento ya pasó y no tiene pago", () => {
    expect(estadoObligacion(base, "2026-10-11")).toBe("vencida");
  });
  it("RN-04: el día del vencimiento todavía está Pendiente", () => {
    expect(estadoObligacion(base, "2026-10-10")).toBe("pendiente");
  });
  it("OBL-02: sin fecha de vencimiento nunca está Vencida", () => {
    expect(estadoObligacion({ ...base, vencimiento: null }, "2030-01-01")).toBe("pendiente");
  });
  it("RN-05: al registrarse el pago pasa a Pagada", () => {
    expect(estadoObligacion({ ...base, pagada: true }, "2026-10-11")).toBe("pagada");
  });
  it("RN-05: si el pago se anula vuelve a Vencida", () => {
    expect(estadoObligacion({ ...base, pagada: false }, "2026-10-11")).toBe("vencida");
  });
  it("OBL-11: sin monto está A completar, pero pagada gana (el pago completa el monto)", () => {
    expect(estadoObligacion({ ...base, monto: null, vencimiento: null }, "2026-10-11")).toBe("a_completar");
    expect(estadoObligacion({ ...base, monto: null, pagada: true }, "2026-10-11")).toBe("pagada");
  });
  it("RN-05: una obligación anulada figura Anulada", () => {
    expect(estadoObligacion({ ...base, anulada: true, pagada: true }, "2026-10-11")).toBe("anulada");
  });
});

describe("RN-01: responsable", () => {
  it("RN-01: sin alquiler el responsable es el propietario aunque haya matriz", () => {
    expect(resolverResponsable(false, "inquilino")).toBe("propietario");
  });
  it("RN-01: con alquiler se hereda de la matriz", () => {
    expect(resolverResponsable(true, "inquilino")).toBe("inquilino");
  });
});

describe("OBL-05: próxima ocurrencia de un gasto recurrente", () => {
  it("OBL-05: mensual pasa de diciembre a enero del año siguiente", () => {
    expect(proximoPeriodo("2026-12-01", "mensual")).toBe("2027-01-01");
  });
  it("OBL-05: bimestral, trimestral, semestral y anual", () => {
    expect(proximoPeriodo("2026-10-01", "bimestral")).toBe("2026-12-01");
    expect(proximoPeriodo("2026-11-01", "trimestral")).toBe("2027-02-01");
    expect(proximoPeriodo("2026-10-01", "semestral")).toBe("2027-04-01");
    expect(proximoPeriodo("2026-10-01", "anual")).toBe("2027-10-01");
  });
});

describe("PAG-01 / PAG-03 / PAG-04: pagos", () => {
  it("PAG-03: rechaza un pago en otra moneda que la obligación", () => {
    expect(validarPago({ montoObligacion: 100, importe: 100, monedaObligacion: "ARS", monedaPago: "USD" })).toEqual({
      ok: false,
      error: "PAG-03",
    });
  });
  it("PAG-01: si el importe difiere del monto pide confirmación", () => {
    expect(validarPago({ montoObligacion: 100, importe: 110, monedaObligacion: "ARS", monedaPago: "ARS" })).toEqual({
      ok: true,
      requiereConfirmacion: true,
      diferencia: 10,
    });
  });
  it("PAG-01: si coincide no pide confirmación", () => {
    const r = validarPago({ montoObligacion: 100, importe: 100, monedaObligacion: "ARS", monedaPago: "ARS" });
    expect(r).toEqual({ ok: true, requiereConfirmacion: false, diferencia: 0 });
  });
  it("PAG-04: administración paga obligación del propietario → débito en su cuenta", () => {
    expect(impactoDelPago("administracion", "propietario")).toBe("debito_propietario");
  });
  it("PAG-04 / RN-03: administración paga obligación del inquilino → deuda del inquilino", () => {
    expect(impactoDelPago("administracion", "inquilino")).toBe("deuda_inquilino");
  });
  it("RN-13: pago directo del propietario o del inquilino → solo historial", () => {
    expect(impactoDelPago("propietario_directo", "propietario")).toBe("solo_historial");
    expect(impactoDelPago("inquilino", "inquilino")).toBe("solo_historial");
  });
});

describe("MOV-01 / RN-05 / MOV-05: cuenta corriente", () => {
  const mov = (moneda: "ARS" | "USD", debe: number, haber: number) => ({ moneda, debe, haber });
  it("MOV-01: el saldo es haber menos debe", () => {
    expect(calcularSaldo([mov("ARS", 0, 100), mov("ARS", 30, 0)], "ARS")).toBe(70);
  });
  it("RN-14: el saldo de una moneda ignora la otra", () => {
    expect(calcularSaldo([mov("ARS", 0, 100), mov("USD", 0, 5)], "USD")).toBe(5);
  });
  it("RN-05: el contramovimiento deja el saldo como estaba", () => {
    const original = { propietarioId: "p", bienId: "b", moneda: "ARS" as const, debe: 500, haber: 0 };
    const contra = contramovimiento(original);
    expect(contra).toMatchObject({ debe: 0, haber: 500 });
    expect(calcularSaldo([original, contra], "ARS")).toBe(0);
  });
  it("MOV-07: el saldo puede quedar deudor (negativo)", () => {
    expect(calcularSaldo([mov("ARS", 800, 0)], "ARS")).toBe(-800);
  });
  it("MOV-05: una transferencia mayor al saldo requiere confirmación", () => {
    expect(transferenciaExcedeSaldo(1000, 1001)).toBe(true);
    expect(transferenciaExcedeSaldo(1000, 1000)).toBe(false);
    expect(transferenciaExcedeSaldo(-50, 1)).toBe(true);
  });
});

describe("RN-16 / PRO-11: pago promedio", () => {
  const dep = (fecha: string, centavos: number, esAjuste = false) => ({ fecha, centavos, moneda: "ARS" as const, esAjuste });
  it("RN-16: promedia los depósitos de 12 meses dividiendo por 12", () => {
    expect(calcularPagoPromedio([dep("2026-01-10", 120000), dep("2026-06-10", 120000)], "ARS", "2026-10-14")).toBe(20000);
  });
  it("RN-16: no cuenta ajustes", () => {
    expect(calcularPagoPromedio([dep("2026-01-10", 120000, true)], "ARS", "2026-10-14")).toBe(0);
  });
  it("RN-16: no cuenta depósitos de hace más de 12 meses ni de otra moneda", () => {
    const depositos = [dep("2025-10-14", 999999), dep("2025-10-15", 12000), { ...dep("2026-02-01", 5000), moneda: "USD" as const }];
    expect(calcularPagoPromedio(depositos, "ARS", "2026-10-14")).toBe(1000);
  });
});

describe("RN-02 / RN-15 / sección 4.5: monto a depositar", () => {
  const hoy = "2026-10-14";
  const ob = (id: string, monto: number | null, vencimiento: string | null, extra: Partial<ObligacionPendiente> = {}): ObligacionPendiente => ({
    id, monto, vencimiento, pagada: false, anulada: false, moneda: "ARS", responsable: "propietario", ...extra,
  });
  const calc = (obligaciones: ObligacionPendiente[], saldoDisponible: number, extra = {}) =>
    calcularMontoADepositar({ obligaciones, moneda: "ARS", saldoDisponible, fechaLimite: "2026-11-13", hoy, ...extra });

  it("4.5: a depositar = obligaciones hasta la fecha límite menos el saldo", () => {
    const r = calc([ob("a", 50000, "2026-10-20"), ob("b", 30000, "2026-11-10")], 20000);
    expect(r.sumaObligaciones).toBe(80000);
    expect(r.aDepositar).toBe(60000);
  });
  it("4.5: si el saldo cubre todo, a depositar es cero y el excedente se transfiere", () => {
    const r = calc([ob("a", 50000, "2026-10-20")], 80000);
    expect(r.aDepositar).toBe(0);
    expect(r.saldoATransferir).toBe(30000);
  });
  it("4.5: no suma lo que vence después de la fecha límite", () => {
    expect(calc([ob("a", 50000, "2026-12-01")], 0).aDepositar).toBe(0);
  });
  it("4.5: las vencidas siempre suman", () => {
    expect(calc([ob("a", 50000, "2026-09-01")], 0).aDepositar).toBe(50000);
  });
  it("RN-02: las obligaciones a cargo del inquilino no suman", () => {
    expect(calc([ob("a", 50000, "2026-10-20", { responsable: "inquilino" })], 0).aDepositar).toBe(0);
  });
  it("RN-14: las obligaciones en dólares no se suman a los pesos", () => {
    expect(calc([ob("a", 50000, "2026-10-20", { moneda: "USD" })], 0).aDepositar).toBe(0);
  });
  it("RN-15: una obligación A completar figura como a confirmar y no suma", () => {
    const r = calc([ob("a", null, null)], 0);
    expect(r.aConfirmar).toEqual(["a"]);
    expect(r.aDepositar).toBe(0);
  });
  it("RN-15 / OBL-07: con monto pero sin vencimiento figura aparte y no suma", () => {
    const r = calc([ob("a", 50000, null)], 0);
    expect(r.posiblesObligaciones).toEqual(["a"]);
    expect(r.aDepositar).toBe(0);
  });
  it("sección 4.2: las pagadas y anuladas no suman", () => {
    const r = calc([ob("a", 50000, "2026-10-20", { pagada: true }), ob("b", 50000, "2026-10-20", { anulada: true })], 0);
    expect(r.aDepositar).toBe(0);
  });
  it("MOV-07: un saldo deudor se suma al monto a depositar", () => {
    expect(calc([ob("a", 50000, "2026-10-20")], -10000).aDepositar).toBe(60000);
  });
  it("PRO-09: se suma la reposición del fondo de reserva", () => {
    expect(calc([ob("a", 50000, "2026-10-20")], 0, { reposicionFondoReserva: 5000 }).aDepositar).toBe(55000);
  });
});
