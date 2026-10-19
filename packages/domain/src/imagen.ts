// Recorte cuadrado del avatar (PRO-12): se elige la zona de la imagen con zoom y desplazamiento,
// y se reduce a 512 px.
export const LADO_AVATAR = 512;
export const ZOOM_MAXIMO_AVATAR = 4;

export interface RecorteCuadrado {
  /** Esquina superior izquierda y lado del cuadrado, en píxeles de la imagen original. */
  x: number;
  y: number;
  lado: number;
}

/**
 * Calcula el cuadrado a recortar. `zoom` va de 1 (toda la imagen, lado = el menor de ancho y alto)
 * a ZOOM_MAXIMO_AVATAR. `desplazX` y `desplazY` van de -1 a 1 y mueven el cuadrado dentro de
 * lo que sobra de la imagen; con 0 queda centrado. Nunca se sale de la imagen.
 */
export function calcularRecorteCuadrado(
  ancho: number,
  alto: number,
  zoom = 1,
  desplazX = 0,
  desplazY = 0,
): RecorteCuadrado {
  const limitar = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
  const z = limitar(zoom, 1, ZOOM_MAXIMO_AVATAR);
  const lado = Math.min(ancho, alto) / z;
  const sobraX = ancho - lado;
  const sobraY = alto - lado;
  return {
    x: (sobraX / 2) * (1 + limitar(desplazX, -1, 1)),
    y: (sobraY / 2) * (1 + limitar(desplazY, -1, 1)),
    lado,
  };
}

export const TIPOS_IMAGEN_AVATAR = ["image/jpeg", "image/png", "image/webp"] as const;
export const esImagenDeAvatar = (tipo: string) => (TIPOS_IMAGEN_AVATAR as readonly string[]).includes(tipo);

/** Carpeta de los avatares de un propietario dentro del almacén: <organizacion>/propietarios/<id>/ */
export const carpetaAvatarPropietario = (organizacionId: string, propietarioId: string) =>
  `${organizacionId}/propietarios/${propietarioId}/`;
