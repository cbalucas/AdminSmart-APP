import { describe, expect, it } from "vitest";
import { elegirTelefonoWhatsApp, enlaceWhatsApp, numeroParaWhatsApp } from "./whatsapp";

describe("Teléfono para WhatsApp", () => {
  it("LIQ-02: se usa el celular", () => {
    expect(elegirTelefonoWhatsApp([{ tipo: "fijo", numero: "1" }, { tipo: "celular", numero: "2" }])?.numero).toBe("2");
  });
  it("LIQ-02: sin celular se usa otro que no sea fijo ni de trabajo", () => {
    expect(elegirTelefonoWhatsApp([{ tipo: "fijo", numero: "1" }, { tipo: "otro", numero: "3" }])?.numero).toBe("3");
  });
  it("LIQ-02: solo con fijo o trabajo no hay teléfono para WhatsApp", () => {
    expect(elegirTelefonoWhatsApp([{ tipo: "fijo", numero: "1" }, { tipo: "trabajo", numero: "4" }])).toBeNull();
    expect(elegirTelefonoWhatsApp([])).toBeNull();
  });
});

describe("Número de WhatsApp", () => {
  it("LIQ-02: un celular argentino con +54 lleva el 9", () => {
    expect(numeroParaWhatsApp("+54 351 555-0100")).toBe("5493515550100");
  });
  it("LIQ-02: si ya trae el 9 no se repite", () => {
    expect(numeroParaWhatsApp("+54 9 351 555-0100")).toBe("5493515550100");
  });
  it("LIQ-02: sin código de país se completa con 549", () => {
    expect(numeroParaWhatsApp("351 555-0100")).toBe("5493515550100");
    expect(numeroParaWhatsApp("0351 555-0100")).toBe("5493515550100");
  });
  it("LIQ-02: se saca el 15 de la característica local", () => {
    expect(numeroParaWhatsApp("0351 15 555-0100")).toBe("5493515550100");
  });
  it("LIQ-02: un número extranjero con + se respeta", () => {
    expect(numeroParaWhatsApp("+1 415 555 0132")).toBe("14155550132");
  });
  it("LIQ-02: un número que no se puede armar devuelve null", () => {
    expect(numeroParaWhatsApp("555")).toBeNull();
    expect(numeroParaWhatsApp("")).toBeNull();
  });
  it("LIQ-02: el enlace lleva el texto codificado", () => {
    expect(enlaceWhatsApp("+54 351 555-0100", "Hola Carlos, $ 1.000")).toBe("https://wa.me/5493515550100?text=Hola%20Carlos%2C%20%241.000".replace("%241.000", "%24%201.000"));
  });
});
