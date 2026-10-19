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

import {
  contratoVigente,
  impedimentosDeVenta,
  puedeQuitarTitular,
  representanteTrasQuitar,
  validarModoLiquidacion,
  validarPorcentajeTitular,
} from "./bienes";

const t = (id: string, porcentaje: number, esRepresentante = false) => ({ id, porcentaje, esRepresentante });

describe("CON-01: alta y cambio de titulares (P-18)", () => {
  it("CON-01: acepta un nuevo titular mientras la suma no pase de 100 %", () => {
    expect(validarPorcentajeTitular([t("a", 50)], 25)).toBeNull();
    expect(validarPorcentajeTitular([t("a", 50), t("b", 25)], 25)).toBeNull();
  });
  it("CON-01: rechaza un titular que haría superar 100 %", () => {
    expect(validarPorcentajeTitular([t("a", 50), t("b", 25)], 30)).toBe("excede");
  });
  it("CON-01: al cambiar el porcentaje de un titular no se cuenta su valor anterior", () => {
    expect(validarPorcentajeTitular([t("a", 50), t("b", 25)], 70, "a")).toBeNull();
    expect(validarPorcentajeTitular([t("a", 50), t("b", 25)], 80, "a")).toBe("excede");
  });
  it("CON-01: el porcentaje debe ser mayor a 0 y hasta 100", () => {
    expect(validarPorcentajeTitular([], 0)).toBe("porcentaje_invalido");
    expect(validarPorcentajeTitular([], 101)).toBe("porcentaje_invalido");
    expect(validarPorcentajeTitular([], Number.NaN)).toBe("porcentaje_invalido");
  });
  it("CON-01: el último titular no se quita", () => {
    expect(puedeQuitarTitular(1)).toBe(false);
    expect(puedeQuitarTitular(2)).toBe(true);
  });
});

describe("CON-04: representante", () => {
  it("CON-04: al quitar al representante pasa al titular con mayor porcentaje", () => {
    expect(representanteTrasQuitar([t("a", 50, true), t("b", 25), t("c", 40)], "a")).toBe("c");
  });
  it("CON-04: al quitar a otro titular el representante no cambia", () => {
    expect(representanteTrasQuitar([t("a", 50, true), t("b", 25)], "b")).toBe("a");
  });
  it("CON-04: sin titulares restantes no hay representante", () => {
    expect(representanteTrasQuitar([t("a", 100, true)], "a")).toBeNull();
  });
  it("CON-04: liquidar al representante exige exactamente uno", () => {
    expect(validarModoLiquidacion("al_representante", [t("a", 50, true), t("b", 25)])).toBeNull();
    expect(validarModoLiquidacion("al_representante", [t("a", 50), t("b", 25)])).toBe("sin_representante");
    expect(validarModoLiquidacion("al_representante", [t("a", 50, true), t("b", 25, true)])).toBe("sin_representante");
  });
  it("CON-04: liquidar por separado no exige representante", () => {
    expect(validarModoLiquidacion("por_separado", [t("a", 50), t("b", 25)])).toBeNull();
  });
  it("CON-04: liquidar a un propietario exige elegir uno de los titulares", () => {
    const titulares = [{ ...t("a", 50), propietarioId: "p1" }, { ...t("b", 25), propietarioId: "p2" }];
    expect(validarModoLiquidacion("a_propietario", titulares, "p2")).toBeNull();
    expect(validarModoLiquidacion("a_propietario", titulares, "p9")).toBe("sin_propietario");
    expect(validarModoLiquidacion("a_propietario", titulares, null)).toBe("sin_propietario");
  });
  it("CON-04: liquidar a un propietario no exige que sea el representante", () => {
    const titulares = [{ ...t("a", 50, true), propietarioId: "p1" }, { ...t("b", 25), propietarioId: "p2" }];
    expect(validarModoLiquidacion("a_propietario", titulares, "p2")).toBeNull();
  });
});

describe("PROP-03: cambio a Vendido", () => {
  const hoy = "2026-10-19";
  it("PROP-03: un contrato vigente ya empezó, no terminó y no fue rescindido", () => {
    expect(contratoVigente({ fechaInicio: "2026-01-01", fechaFin: "2027-01-01", rescisionFecha: null }, hoy)).toBe(true);
    expect(contratoVigente({ fechaInicio: "2026-01-01", fechaFin: null, rescisionFecha: null }, hoy)).toBe(true);
  });
  it("PROP-03: un contrato que todavía no empezó, ya terminó o fue rescindido no está vigente", () => {
    expect(contratoVigente({ fechaInicio: "2026-11-01", fechaFin: null, rescisionFecha: null }, hoy)).toBe(false);
    expect(contratoVigente({ fechaInicio: "2025-01-01", fechaFin: "2026-10-18", rescisionFecha: null }, hoy)).toBe(false);
    expect(contratoVigente({ fechaInicio: "2025-01-01", fechaFin: "2027-01-01", rescisionFecha: "2026-10-19" }, hoy)).toBe(false);
  });
  it("PROP-03: el último día del contrato todavía está vigente", () => {
    expect(contratoVigente({ fechaInicio: "2025-01-01", fechaFin: "2026-10-19", rescisionFecha: null }, hoy)).toBe(true);
  });
  it("PROP-03: obligaciones pendientes o contrato vigente impiden vender", () => {
    expect(impedimentosDeVenta({ obligacionesPendientes: 0, contratosVigentes: 0 })).toEqual([]);
    expect(impedimentosDeVenta({ obligacionesPendientes: 2, contratosVigentes: 0 })).toEqual(["obligaciones"]);
    expect(impedimentosDeVenta({ obligacionesPendientes: 1, contratosVigentes: 1 })).toEqual(["obligaciones", "contrato"]);
  });
});
