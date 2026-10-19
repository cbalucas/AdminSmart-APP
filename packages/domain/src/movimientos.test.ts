import { describe, expect, it } from "vitest";
import { conSaldoAcumulado, esquemaMovimientoManual, esquemaTraspaso, ladoDelMovimiento, sePuedeAnularMovimiento, tipoDeCambioDelTraspaso } from "./movimientos";

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
  const traspaso = { propietarioId: "p", bienId: "b", monedaOrigen: "ARS", importeOrigen: "1.250.000", importeDestino: "1.000", fecha: "2026-10-19" };
  it("MOV-04: la moneda de destino es la otra", () => {
    expect(esquemaTraspaso.parse(traspaso).monedaDestino).toBe("USD");
    expect(esquemaTraspaso.parse({ ...traspaso, monedaOrigen: "USD" }).monedaDestino).toBe("ARS");
  });
  it("MOV-04: exige los dos importes", () => {
    expect(esquemaTraspaso.safeParse({ ...traspaso, importeDestino: "" }).success).toBe(false);
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
