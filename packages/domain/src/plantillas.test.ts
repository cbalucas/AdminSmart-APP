import { describe, expect, it } from "vitest";
import { completarPlantilla, validarPlantilla, variablesDeTexto } from "./plantillas";

const ok = { documento: "resumen_deposito" as const, canal: "whatsapp" as const, asunto: "", cuerpo: "Hola {nombre}, el monto es {monto}. {administracion}" };

describe("Plantillas de envío", () => {
  it("PLA-02: un texto con datos conocidos se puede guardar", () => {
    expect(validarPlantilla(ok)).toBeNull();
  });
  it("PLA-02: un dato entre llaves desconocido impide guardar y se informa cuál es", () => {
    expect(validarPlantilla({ ...ok, cuerpo: "Hola {nombre} {apellido}" })).toEqual({ error: "validacion.plantilla_variable", desconocidas: ["apellido"] });
  });
  it("PLA-02: un dato válido para otro documento tampoco se acepta", () => {
    expect(validarPlantilla({ ...ok, cuerpo: "Alquiler de {periodo}" })).toEqual({ error: "validacion.plantilla_variable", desconocidas: ["periodo"] });
    expect(validarPlantilla({ documento: "recibo", canal: "whatsapp", asunto: "", cuerpo: "Alquiler de {periodo}" })).toBeNull();
  });
  it("PLA-01: el cuerpo es obligatorio", () => {
    expect(validarPlantilla({ ...ok, cuerpo: "  " })).toEqual({ error: "validacion.plantilla_cuerpo" });
  });
  it("PLA-01: el email exige asunto", () => {
    expect(validarPlantilla({ ...ok, canal: "email", asunto: "" })).toEqual({ error: "validacion.plantilla_asunto" });
    expect(validarPlantilla({ ...ok, canal: "email", asunto: "Monto a depositar · {numero}" })).toBeNull();
  });
  it("PLA-02: también se controlan los datos del asunto del email", () => {
    expect(validarPlantilla({ ...ok, canal: "email", asunto: "Hola {saludo}" })).toEqual({ error: "validacion.plantilla_variable", desconocidas: ["saludo"] });
  });
  it("PLA-01: se listan los datos usados sin repetir", () => {
    expect(variablesDeTexto("{nombre} y {nombre}, {monto}")).toEqual(["nombre", "monto"]);
  });
  it("PLA-01: los datos se completan con sus valores", () => {
    expect(completarPlantilla("Hola {nombre}, {monto}", { nombre: "Carlos", monto: "$ 1.000" })).toBe("Hola Carlos, $ 1.000");
  });
  it("PLA-01: un dato sin valor queda entre llaves hasta que exista (por ejemplo el número del resumen)", () => {
    expect(completarPlantilla("Resumen {numero} de {nombre}", { nombre: "Carlos" })).toBe("Resumen {numero} de Carlos");
  });
});
