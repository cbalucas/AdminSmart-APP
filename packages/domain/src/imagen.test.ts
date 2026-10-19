import { describe, expect, it } from "vitest";
import {
  calcularRecorteCuadrado,
  carpetaAvatarPropietario,
  esImagenDeAvatar,
  LADO_AVATAR,
  ZOOM_MAXIMO_AVATAR,
} from "./imagen";

describe("PRO-12: recorte cuadrado del avatar", () => {
  it("PRO-12: sin zoom ni desplazamiento recorta el cuadrado central", () => {
    expect(calcularRecorteCuadrado(1000, 600)).toEqual({ x: 200, y: 0, lado: 600 });
    expect(calcularRecorteCuadrado(600, 1000)).toEqual({ x: 0, y: 200, lado: 600 });
  });
  it("PRO-12: una imagen ya cuadrada se toma entera", () => {
    expect(calcularRecorteCuadrado(800, 800)).toEqual({ x: 0, y: 0, lado: 800 });
  });
  it("PRO-12: el zoom achica el cuadrado", () => {
    expect(calcularRecorteCuadrado(800, 800, 2)).toEqual({ x: 200, y: 200, lado: 400 });
  });
  it("PRO-12: el desplazamiento llega a los bordes sin salirse de la imagen", () => {
    const izquierda = calcularRecorteCuadrado(1000, 600, 1, -1, 0);
    const derecha = calcularRecorteCuadrado(1000, 600, 1, 1, 0);
    expect(izquierda.x).toBe(0);
    expect(derecha.x + derecha.lado).toBe(1000);
  });
  it("PRO-12: valores fuera de rango se limitan", () => {
    const r = calcularRecorteCuadrado(1000, 600, 99, 5, -5);
    expect(r.lado).toBe(600 / ZOOM_MAXIMO_AVATAR);
    expect(r.x).toBeGreaterThanOrEqual(0);
    expect(r.x + r.lado).toBeLessThanOrEqual(1000);
    expect(r.y).toBeGreaterThanOrEqual(0);
    expect(calcularRecorteCuadrado(1000, 600, 0.1).lado).toBe(600);
  });
  it("PRO-12: el avatar se reduce a 512 px", () => {
    expect(LADO_AVATAR).toBe(512);
  });
  it("PRO-12: solo JPG, PNG o WebP", () => {
    expect(esImagenDeAvatar("image/webp")).toBe(true);
    expect(esImagenDeAvatar("image/gif")).toBe(false);
    expect(esImagenDeAvatar("application/pdf")).toBe(false);
  });
  it("SEG-03: los archivos van bajo una carpeta con el id de la organización", () => {
    expect(carpetaAvatarPropietario("org-1", "prop-2")).toBe("org-1/propietarios/prop-2/");
  });
});
