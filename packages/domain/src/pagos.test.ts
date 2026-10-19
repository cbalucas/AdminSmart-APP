import { describe, expect, it } from "vitest";
import { validarPago } from "./obligaciones";
import { debitosDelPago, dejaSaldoDeudor, esquemaAnulacion, esquemaPago, esquemaPagoDirecto, exigirConfirmacionDeDiferencia, leyendaDeDiferencia } from "./pagos";

const base = { obligacionId: "o", fecha: "2026-10-19", importe: "41.300", pagadoPor: "administracion" };

describe("Alta de pago", () => {
  it("PAG-01: el importe se guarda en centavos", () => {
    expect(esquemaPago.parse(base).importe).toBe(4130000);
  });
  it("PAG-01: rechaza un importe vacío, en cero o mal escrito", () => {
    expect(esquemaPago.safeParse({ ...base, importe: "" }).success).toBe(false);
    expect(esquemaPago.safeParse({ ...base, importe: "0" }).success).toBe(false);
    expect(esquemaPago.safeParse({ ...base, importe: "abc" }).success).toBe(false);
  });
  it("PAG-04: exige indicar quién pagó", () => {
    expect(esquemaPago.safeParse({ ...base, pagadoPor: "" }).success).toBe(false);
  });
  it("PAG-02: el pago directo exige bien, concepto, responsable y descripción", () => {
    const directo = { ...base, bienId: "b", conceptoId: "c", responsable: "propietario", descripcion: "Reparación" };
    expect(esquemaPagoDirecto.safeParse(directo).success).toBe(true);
    expect(esquemaPagoDirecto.safeParse({ ...directo, descripcion: "" }).success).toBe(false);
    expect(esquemaPagoDirecto.safeParse({ ...directo, bienId: "" }).success).toBe(false);
  });
  it("PAG-05: la anulación exige motivo", () => {
    expect(esquemaAnulacion.safeParse({ motivo: "" }).success).toBe(false);
    expect(esquemaAnulacion.safeParse({ motivo: "Se pagó dos veces" }).success).toBe(true);
  });
});

describe("Diferencia de importe", () => {
  const dif = validarPago({ montoObligacion: 4130000, importe: 4200000, monedaObligacion: "ARS", monedaPago: "ARS" });
  const igual = validarPago({ montoObligacion: 4130000, importe: 4130000, monedaObligacion: "ARS", monedaPago: "ARS" });
  it("PAG-01: sin diferencia no pide confirmación", () => {
    if (!igual.ok) throw new Error("no debía fallar");
    expect(exigirConfirmacionDeDiferencia(igual, { confirmar: false, motivo: null }).ok).toBe(true);
  });
  it("PAG-01: con diferencia pide confirmación y motivo", () => {
    if (!dif.ok) throw new Error("no debía fallar");
    expect(exigirConfirmacionDeDiferencia(dif, { confirmar: false, motivo: null })).toEqual({ ok: false, error: "validacion.diferencia_sin_confirmar" });
    expect(exigirConfirmacionDeDiferencia(dif, { confirmar: true, motivo: null })).toEqual({ ok: false, error: "validacion.motivo_diferencia" });
    expect(exigirConfirmacionDeDiferencia(dif, { confirmar: true, motivo: "Recargo por mora" }).ok).toBe(true);
  });
  it("PAG-01: la diferencia queda escrita con su motivo", () => {
    expect(leyendaDeDiferencia(4130000, 4200000, "Recargo por mora")).toBe("Diferencia +700,00 respecto del monto (41300,00): Recargo por mora");
  });
});

describe("Impacto del pago en la cuenta corriente", () => {
  const dos = [
    { propietarioId: "a", porcentaje: 50 },
    { propietarioId: "b", porcentaje: 50 },
  ];
  it("PAG-04: la administración paga una obligación del propietario: débito para cada titular según su porcentaje", () => {
    expect(debitosDelPago({ pagadoPor: "administracion", responsable: "propietario", importe: 10001, titulares: dos })).toEqual([
      { propietarioId: "a", debe: 5001 },
      { propietarioId: "b", debe: 5000 },
    ]);
  });
  it("CON-02: la parte de los cotitulares no cargados no se imputa a nadie", () => {
    const d = debitosDelPago({
      pagadoPor: "administracion",
      responsable: "propietario",
      importe: 100000,
      titulares: [{ propietarioId: "a", porcentaje: 85 }],
    });
    expect(d).toEqual([{ propietarioId: "a", debe: 85000 }]);
  });
  it("RN-13: si paga el propietario directamente no hay movimiento", () => {
    expect(debitosDelPago({ pagadoPor: "propietario_directo", responsable: "propietario", importe: 10000, titulares: dos })).toEqual([]);
  });
  it("PAG-04: si paga el inquilino no hay movimiento del propietario", () => {
    expect(debitosDelPago({ pagadoPor: "inquilino", responsable: "inquilino", importe: 10000, titulares: dos })).toEqual([]);
  });
  it("RN-03: una obligación a cargo del inquilino pagada por la administración no debita al propietario", () => {
    expect(debitosDelPago({ pagadoPor: "administracion", responsable: "inquilino", importe: 10000, titulares: dos })).toEqual([]);
  });
  it("MOV-07: avisa cuando el débito deja saldo deudor", () => {
    expect(dejaSaldoDeudor(30000, 41300)).toBe(true);
    expect(dejaSaldoDeudor(50000, 41300)).toBe(false);
    expect(dejaSaldoDeudor(41300, 41300)).toBe(false);
  });
});
