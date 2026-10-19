import { describe, expect, it } from "vitest";
import {
  enlaceGoogleMaps,
  esquemaBien,
  esquemaTitular,
  estadoInicial,
  estadoTitularidad,
  formatearDireccion,
  normalizarDominio,
  porcentajeDisponible,
} from "./bienes";

const mensajes = (r: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) =>
  r.error?.issues.map((i) => `${String(i.path[0])}:${i.message}`) ?? [];

const casa = {
  tipoBien: "inmueble",
  subtipo: "departamento",
  alias: "Dpto Caseros",
  calle: "Caseros",
  numero: "681",
  localidad: "Córdoba",
  provincia: "Córdoba",
};

describe("PROP-04 / diccionario 3: alta de bien por tipo", () => {
  it("diccionario 3: un inmueble con subtipo y dirección es válido", () => {
    expect(esquemaBien.safeParse(casa).success).toBe(true);
  });
  it("diccionario 3: un inmueble exige subtipo y dirección completa", () => {
    const r = esquemaBien.safeParse({ tipoBien: "inmueble", alias: "X" });
    expect(mensajes(r)).toEqual([
      "subtipo:validacion.subtipo_obligatorio",
      "calle:validacion.dato_obligatorio",
      "numero:validacion.dato_obligatorio",
      "localidad:validacion.dato_obligatorio",
      "provincia:validacion.dato_obligatorio",
    ]);
  });
  it("PROP-04: un inmueble en un edificio cargado hereda la dirección y no la pide", () => {
    const r = esquemaBien.safeParse({
      tipoBien: "inmueble", subtipo: "departamento", alias: "Depto 3B",
      edificioNombre: "Torre Centro", edificioExistente: true, unidadFuncional: "3B",
    });
    expect(r.success).toBe(true);
  });
  it("PROP-04: un edificio nuevo sí exige la dirección", () => {
    const r = esquemaBien.safeParse({
      tipoBien: "inmueble", subtipo: "departamento", alias: "Depto 3B",
      edificioNombre: "Torre Nueva", edificioExistente: false,
    });
    expect(mensajes(r)).toContain("calle:validacion.dato_obligatorio");
  });
  it("diccionario 3: un terreno pide dirección pero no subtipo", () => {
    expect(esquemaBien.safeParse({ ...casa, tipoBien: "terreno", subtipo: "" }).success).toBe(true);
    expect(mensajes(esquemaBien.safeParse({ tipoBien: "terreno", alias: "T" }))).toContain("calle:validacion.dato_obligatorio");
  });
  it("diccionario 3: un vehículo exige subtipo y dominio, y no pide dirección", () => {
    const r = esquemaBien.safeParse({ tipoBien: "vehiculo", alias: "Auto" });
    expect(mensajes(r)).toEqual(["subtipo:validacion.subtipo_obligatorio", "dominio:validacion.dominio_obligatorio"]);
    expect(esquemaBien.safeParse({ tipoBien: "vehiculo", subtipo: "auto", alias: "Auto AI539LO", dominio: "ai 539-lo" }).success).toBe(true);
  });
  it("diccionario 3: el dominio se guarda sin espacios ni guiones y en mayúsculas", () => {
    expect(normalizarDominio("ai 539-lo")).toBe("AI539LO");
    const r = esquemaBien.safeParse({ tipoBien: "vehiculo", subtipo: "auto", alias: "A", dominio: "ab 123 cd" });
    expect(r.success && r.data.dominio).toBe("AB123CD");
  });
  it("diccionario 3: otros solo pide alias", () => {
    expect(esquemaBien.safeParse({ tipoBien: "otros", alias: "Joyas" }).success).toBe(true);
  });
  it("diccionario 3: el alias es obligatorio", () => {
    expect(mensajes(esquemaBien.safeParse({ tipoBien: "otros", alias: "  " }))).toContain("alias:validacion.nombre_obligatorio");
  });
  it("diccionario 3: el estado debe corresponder al tipo de bien", () => {
    expect(esquemaBien.safeParse({ tipoBien: "vehiculo", subtipo: "auto", alias: "A", dominio: "AA111AA", estado: "alquilado" }).success).toBe(false);
    expect(esquemaBien.safeParse({ ...casa, estado: "alquilado" }).success).toBe(true);
  });
  it("diccionario 3: el estado inicial depende del tipo", () => {
    expect(estadoInicial("inmueble")).toBe("disponible");
    expect(estadoInicial("vehiculo")).toBe("activo");
    expect(estadoInicial("otros")).toBe("activo");
  });
  it("diccionario 3: las coordenadas van juntas", () => {
    expect(mensajes(esquemaBien.safeParse({ ...casa, latitud: -31.4 }))).toContain("latitud:validacion.coordenadas_incompletas");
    expect(esquemaBien.safeParse({ ...casa, latitud: -31.4, longitud: -64.18 }).success).toBe(true);
    expect(esquemaBien.safeParse({ ...casa, latitud: 120, longitud: 0 }).success).toBe(false);
  });
  it("diccionario 3: el año del vehículo es razonable", () => {
    expect(esquemaBien.safeParse({ tipoBien: "vehiculo", subtipo: "auto", alias: "A", dominio: "AA111AA", anio: 1800 }).success).toBe(false);
    expect(esquemaBien.safeParse({ tipoBien: "vehiculo", subtipo: "auto", alias: "A", dominio: "AA111AA", anio: 2019 }).success).toBe(true);
  });
});

describe("PROP-09: ubicación en Google Maps", () => {
  it("PROP-09: con coordenadas abre el punto exacto", () => {
    expect(enlaceGoogleMaps({ latitud: -31.4201, longitud: -64.1888 })).toBe("https://www.google.com/maps?q=-31.4201,-64.1888");
  });
  it("PROP-09: sin coordenadas busca por la dirección", () => {
    const url = enlaceGoogleMaps({ latitud: null, longitud: null, calle: "Caseros", numero: "681", localidad: "Córdoba", provincia: "Córdoba" });
    expect(url).toBe("https://www.google.com/maps/search/?api=1&query=Caseros%20681%2C%20C%C3%B3rdoba%2C%20C%C3%B3rdoba%2C%20Argentina");
  });
  it("PROP-09: sin coordenadas ni calle no hay enlace", () => {
    expect(enlaceGoogleMaps({ latitud: null, longitud: null })).toBeNull();
  });
  it("PROP-04: formatea la dirección en una línea", () => {
    expect(formatearDireccion({ calle: "Caseros", numero: "681", piso: "3", departamento: "B", localidad: "Córdoba", provincia: "Córdoba" })).toBe(
      "Caseros 681, piso 3, depto B, Córdoba, Córdoba",
    );
    expect(formatearDireccion({})).toBe("");
  });
});

describe("CON-01: titularidad del bien", () => {
  it("CON-01: sin titulares el bien está incompleto", () => {
    expect(estadoTitularidad([])).toBe("vacia");
  });
  it("CON-01: 100 % exacto está completa, aun con decimales", () => {
    expect(estadoTitularidad([100])).toBe("completa");
    expect(estadoTitularidad([33.3333, 33.3333, 33.3334])).toBe("completa");
  });
  it("CON-01: suma menor a 100 % es parcial y válida (Caseros: 50 + 25 + 10)", () => {
    expect(estadoTitularidad([50, 25, 10])).toBe("parcial");
  });
  it("CON-01: suma mayor a 100 % está excedida", () => {
    expect(estadoTitularidad([60, 50])).toBe("excedida");
  });
  it("CON-01: calcula el porcentaje que todavía se puede asignar", () => {
    expect(porcentajeDisponible([50, 25, 10])).toBe(15);
    expect(porcentajeDisponible([])).toBe(100);
    expect(porcentajeDisponible([100])).toBe(0);
    expect(porcentajeDisponible([70, 40])).toBe(0);
  });
  it("CON-01: cada titular lleva un porcentaje mayor a 0 y hasta 100", () => {
    expect(esquemaTitular.safeParse({ propietarioId: "p", porcentaje: 50 }).success).toBe(true);
    expect(esquemaTitular.safeParse({ propietarioId: "p", porcentaje: 0 }).success).toBe(false);
    expect(esquemaTitular.safeParse({ propietarioId: "p", porcentaje: 101 }).success).toBe(false);
    expect(esquemaTitular.safeParse({ propietarioId: "", porcentaje: 50 }).success).toBe(false);
  });
});
