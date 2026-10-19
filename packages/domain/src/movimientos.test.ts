import { describe, expect, it } from "vitest";
import { completarTraspaso, conSaldoAcumulado, esquemaMovimientoManual, esquemaTraspaso, ladoDelMovimiento, parsearCotizacion, sePuedeAnularMovimiento, tipoDeCambioDelTraspaso } from "./movimientos";

const base = { propietarioId: "p", bienId: "b", tipo: "deposito_propietario", moneda: "ARS", fecha: "2026-10-19", importe: "100.000", descripcion: "Depósito de octubre" };

describe("Movimientos manuales", () => {
  it("MOV-03: el depósito suma y la transferencia y el gasto extraordinario restan", () => {
    expect(ladoDelMovimiento("deposito_propietario")).toBe("haber");
    expect(ladoDelMovimiento("transferencia_propietario")).toBe("debe");
    expect(ladoDelMovimiento("gasto_extraordinario")).toBe("debe");
  });
  it("MOV-03: el ajuste puede ir al debe o al haber", () => {
    expect(ladoDelMovimiento("ajuste_manual", "haber")).toBe("haber");
    expect(ladoDelMovimiento("ajuste_manual", "debe")).toBe("debe");
  });
  it("MOV-03: exige bien y descripción", () => {
    expect(esquemaMovimientoManual.safeParse(base).success).toBe(true);
    expect(esquemaMovimientoManual.safeParse({ ...base, bienId: "" }).success).toBe(false);
    expect(esquemaMovimientoManual.safeParse({ ...base, descripcion: "" }).success).toBe(false);
  });
  it("RN-06: el importe se guarda en centavos y no admite cero", () => {
    expect(esquemaMovimientoManual.parse(base).importe).toBe(10000000);
    expect(esquemaMovimientoManual.safeParse({ ...base, importe: "0" }).success).toBe(false);
  });
  it("MOV-03: un ajuste al haber queda del lado del haber", () => {
    expect(esquemaMovimientoManual.parse({ ...base, tipo: "ajuste_manual", ajuste: "haber" }).lado).toBe("haber");
  });
});

describe("Traspaso entre monedas", () => {
  const traspaso = { propietarioId: "p", bienId: "b", monedaOrigen: "ARS", fecha: "2026-10-19" };
  it("MOV-04: con monto en pesos y monto en dólares calcula la cotización", () => {
    const r = esquemaTraspaso.parse({ ...traspaso, montoPesos: "1.250.000", montoDolares: "1.000" });
    expect(r.tipoCambio).toBe(1250);
    expect(r.importeOrigen).toBe(125000000);
    expect(r.importeDestino).toBe(100000);
  });
  it("MOV-04: con cotización y monto en dólares calcula el monto en pesos", () => {
    const r = esquemaTraspaso.parse({ ...traspaso, cotizacion: "1.250,50", montoDolares: "100" });
    expect(r.importeOrigen).toBe(12505000);
    expect(r.importeDestino).toBe(10000);
    expect(r.tipoCambio).toBe(1250.5);
  });
  it("MOV-04: con cotización y monto en pesos calcula el monto en dólares", () => {
    const r = esquemaTraspaso.parse({ ...traspaso, cotizacion: "1.250", montoPesos: "125.000" });
    expect(r.importeDestino).toBe(10000);
  });
  it("MOV-04: la moneda de origen decide cuál importe sale y cuál entra", () => {
    const r = esquemaTraspaso.parse({ ...traspaso, monedaOrigen: "USD", cotizacion: "1.250", montoDolares: "100" });
    expect(r.monedaDestino).toBe("ARS");
    expect(r.importeOrigen).toBe(10000);
    expect(r.importeDestino).toBe(12500000);
  });
  it("MOV-04: exige al menos dos de los tres datos", () => {
    const r = esquemaTraspaso.safeParse({ ...traspaso, montoPesos: "125.000" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe("validacion.traspaso_dos_datos");
    expect(esquemaTraspaso.safeParse(traspaso).success).toBe(false);
  });
  it("MOV-04: rechaza un dato mal escrito o en cero", () => {
    expect(esquemaTraspaso.safeParse({ ...traspaso, cotizacion: "abc", montoPesos: "125.000" }).success).toBe(false);
    expect(esquemaTraspaso.safeParse({ ...traspaso, montoPesos: "0", montoDolares: "100" }).success).toBe(false);
  });
  it("MOV-04: si vienen los tres datos y son coherentes conserva la cotización escrita", () => {
    expect(completarTraspaso({ cotizacion: 1250.5, pesos: 12505000, dolares: 10000 })?.cotizacion).toBe(1250.5);
  });
  it("MOV-04: la cotización escrita se conserva aunque el redondeo del centavo de dólar mueva los pesos", () => {
    expect(completarTraspaso({ cotizacion: 1300, pesos: 13050000, dolares: 10038 })?.cotizacion).toBe(1300);
  });
  it("MOV-04: si vienen los tres y no son coherentes mandan los montos", () => {
    expect(completarTraspaso({ cotizacion: 900, pesos: 12500000, dolares: 10000 })?.cotizacion).toBe(1250);
  });
  it("MOV-04: la cotización se lee con formato es-AR", () => {
    expect(parsearCotizacion("1.250,5")).toBe(1250.5);
    expect(parsearCotizacion("0")).toBeNull();
    expect(parsearCotizacion("abc")).toBeNull();
  });
  it("MOV-04: el tipo de cambio sale de los dos importes, en pesos por dólar", () => {
    expect(tipoDeCambioDelTraspaso({ moneda: "ARS", centavos: 125000000 }, { moneda: "USD", centavos: 100000 })).toBe(1250);
    expect(tipoDeCambioDelTraspaso({ moneda: "USD", centavos: 100000 }, { moneda: "ARS", centavos: 125000000 })).toBe(1250);
  });
});

describe("Libro de la cuenta corriente", () => {
  it("MOV-01: el saldo acumulado es haber menos debe", () => {
    const r = conSaldoAcumulado([
      { id: "1", debe: 0, haber: 100000 },
      { id: "2", debe: 41300, haber: 0 },
      { id: "3", debe: 0, haber: 5000 },
    ]);
    expect(r.map((m) => m.saldo)).toEqual([100000, 58700, 63700]);
  });
  it("MOV-01: parte de un saldo inicial cuando se filtra por fechas", () => {
    expect(conSaldoAcumulado([{ id: "1", debe: 1000, haber: 0 }], 5000)[0]?.saldo).toBe(4000);
  });
  it("MOV-01: un movimiento y su contramovimiento se compensan", () => {
    const r = conSaldoAcumulado([
      { id: "1", debe: 41300, haber: 0 },
      { id: "2", debe: 0, haber: 41300 },
    ]);
    expect(r[1]?.saldo).toBe(0);
  });
  it("MOV-02: los movimientos automáticos no se anulan desde la cuenta corriente", () => {
    expect(sePuedeAnularMovimiento({ origenTipo: "pago", esContramovimiento: false, yaAnulado: false })).toBe(false);
  });
  it("MOV-03: un movimiento manual vigente se puede anular", () => {
    expect(sePuedeAnularMovimiento({ origenTipo: "manual", esContramovimiento: false, yaAnulado: false })).toBe(true);
  });
  it("RN-05: un contramovimiento o un movimiento ya anulado no se anula de nuevo", () => {
    expect(sePuedeAnularMovimiento({ origenTipo: "manual", esContramovimiento: true, yaAnulado: false })).toBe(false);
    expect(sePuedeAnularMovimiento({ origenTipo: "manual", esContramovimiento: false, yaAnulado: true })).toBe(false);
  });
});
