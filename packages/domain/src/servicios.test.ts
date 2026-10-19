import { describe, expect, it } from "vitest";
import {
  esquemaConcepto,
  esquemaServicio,
  esSitioBoletasValido,
  mismoConcepto,
  monedaDelMonto,
} from "./servicios";

const mensajes = (r: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) =>
  r.error?.issues.map((i) => `${String(i.path[0])}:${i.message}`) ?? [];

const base = {
  conceptoId: "c1",
  nroCuentaCliente: "110124278791",
  empresaPrestadora: "Rentas de Córdoba",
  responsableDefault: "propietario",
};

describe("diccionario 4.1: catálogo de conceptos", () => {
  it("diccionario 4.1: pide nombre y categoría", () => {
    expect(esquemaConcepto.safeParse({ nombre: "Piletero", categoria: "otro" }).success).toBe(true);
    expect(mensajes(esquemaConcepto.safeParse({ nombre: " ", categoria: "otro" }))).toContain("nombre:validacion.nombre_obligatorio");
    expect(esquemaConcepto.safeParse({ nombre: "X", categoria: "inventada" }).success).toBe(false);
  });
  it("diccionario 4.1: el nombre es único sin distinguir mayúsculas ni espacios", () => {
    expect(mismoConcepto("Agua", "  agua ")).toBe(true);
    expect(mismoConcepto("Pileta/jardín", "pileta/ jardín")).toBe(false);
    expect(mismoConcepto("Luz", "Gas")).toBe(false);
  });
});

describe("diccionario 4: servicio o impuesto del bien", () => {
  it("diccionario 4: con los datos obligatorios es válido y toma los valores por defecto", () => {
    const r = esquemaServicio.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.estado).toBe("activo");
      expect(r.data.debitoAutomatico).toBe(false);
      expect(r.data.periodicidad).toBeNull();
      expect(r.data.montoEstimado).toBeNull();
    }
  });
  it("diccionario 4: exige concepto, número de cuenta, empresa y responsable", () => {
    const r = esquemaServicio.safeParse({});
    expect(mensajes(r).sort()).toEqual([
      "conceptoId:validacion.dato_obligatorio",
      "empresaPrestadora:validacion.dato_obligatorio",
      "nroCuentaCliente:validacion.dato_obligatorio",
      "responsableDefault:validacion.dato_obligatorio",
    ]);
  });
  it("diccionario 4: la periodicidad es una de las seis y el día va de 1 a 31", () => {
    expect(esquemaServicio.safeParse({ ...base, periodicidad: "bimestral", diaVencimiento: 15 }).success).toBe(true);
    expect(esquemaServicio.safeParse({ ...base, periodicidad: "quincenal" }).success).toBe(false);
    expect(mensajes(esquemaServicio.safeParse({ ...base, diaVencimiento: 32 }))).toContain("diaVencimiento:validacion.dia_invalido");
    expect(esquemaServicio.safeParse({ ...base, diaVencimiento: 0 }).success).toBe(false);
  });
  it("RN-06: el monto estimado se guarda en centavos", () => {
    const r = esquemaServicio.safeParse({ ...base, montoEstimado: "26.226,50", montoEstimadoMoneda: "USD" });
    expect(r.success && r.data.montoEstimado).toBe(2622650);
    expect(r.success && monedaDelMonto(r.data)).toBe("USD");
  });
  it("diccionario 4: sin monto estimado tampoco hay moneda", () => {
    const r = esquemaServicio.safeParse({ ...base, montoEstimado: "", montoEstimadoMoneda: "USD" });
    expect(r.success && monedaDelMonto(r.data)).toBeNull();
  });
  it("RN-06: rechaza un monto mal escrito o cero", () => {
    expect(mensajes(esquemaServicio.safeParse({ ...base, montoEstimado: "mucho" }))).toContain("montoEstimado:validacion.importe_invalido");
    expect(esquemaServicio.safeParse({ ...base, montoEstimado: "0" }).success).toBe(false);
  });
});

describe("diccionario 4: sitio de boletas (nunca se guardan contraseñas)", () => {
  it("diccionario 4: acepta direcciones http y https", () => {
    expect(esSitioBoletasValido("https://www.epec.com.ar/boletas")).toBe(true);
    expect(esSitioBoletasValido("http://sitio.com")).toBe(true);
  });
  it("diccionario 4: rechaza direcciones con usuario y clave incrustados", () => {
    expect(esSitioBoletasValido("https://usuario:clave@sitio.com")).toBe(false);
    expect(esSitioBoletasValido("https://usuario@sitio.com")).toBe(false);
  });
  it("diccionario 4: rechaza lo que no es una dirección web", () => {
    expect(esSitioBoletasValido("javascript:alert(1)")).toBe(false);
    expect(esSitioBoletasValido("no es una url")).toBe(false);
    expect(esSitioBoletasValido("ftp://sitio.com")).toBe(false);
  });
  it("diccionario 4: si falta el https se agrega", () => {
    const r = esquemaServicio.safeParse({ ...base, sitioBoletas: "www.epec.com.ar" });
    expect(r.success && r.data.sitioBoletas).toBe("https://www.epec.com.ar");
  });
  it("diccionario 4: el formulario rechaza la dirección con clave", () => {
    expect(mensajes(esquemaServicio.safeParse({ ...base, sitioBoletas: "https://u:p@sitio.com" }))).toContain("sitioBoletas:validacion.sitio_invalido");
  });
});
