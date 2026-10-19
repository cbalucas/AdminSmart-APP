// Reglas del bien (sección 3 del diccionario) y de su titularidad (sección 5).
// Los mensajes de error son claves de `packages/i18n/src/es-AR.json`.
import { z } from "zod";

export const TIPOS_BIEN = ["inmueble", "terreno", "vehiculo", "otros"] as const;
export type TipoBien = (typeof TIPOS_BIEN)[number];

export const SUBTIPOS_INMUEBLE = ["casa", "departamento", "local", "oficina", "cochera", "galpon", "otro"] as const;
export const SUBTIPOS_VEHICULO = ["auto", "moto", "camioneta", "otro"] as const;

/** Estados según el tipo de bien (diccionario 3). El primero es el estado inicial. */
export const ESTADOS_POR_TIPO: Record<TipoBien, readonly string[]> = {
  inmueble: ["disponible", "alquilado", "en_refaccion", "vendido"],
  terreno: ["disponible", "alquilado", "en_refaccion", "vendido"],
  vehiculo: ["activo", "vendido"],
  otros: ["activo", "de_baja"],
};

export const estadoInicial = (tipo: TipoBien): string => ESTADOS_POR_TIPO[tipo][0]!;

export const subtiposDe = (tipo: TipoBien): readonly string[] =>
  tipo === "inmueble" ? SUBTIPOS_INMUEBLE : tipo === "vehiculo" ? SUBTIPOS_VEHICULO : [];

export const tieneDireccion = (tipo: TipoBien) => tipo === "inmueble" || tipo === "terreno";

/** Patente: sin espacios ni guiones y en mayúsculas ("ai 539-lo" → "AI539LO"). */
export const normalizarDominio = (valor: string) => valor.replace(/[\s-]/g, "").toUpperCase();

const texto = z.string().trim();
const textoOpcional = texto.optional().transform((v) => (v ? v : null));

const coordenada = (min: number, max: number) =>
  z
    .number()
    .min(min)
    .max(max)
    .nullable()
    .default(null);

/**
 * Datos del bien. Qué se pide depende del tipo (PROP-04, PROP-08):
 * - Inmueble: subtipo y dirección, o edificio (hereda la dirección).
 * - Terreno: dirección.
 * - Vehículo: subtipo y dominio.
 * - Otros: alias y descripción.
 * `edificioExistente` indica que el edificio elegido ya está cargado y aporta su dirección.
 */
export const esquemaBien = z
  .object({
    tipoBien: z.enum(TIPOS_BIEN),
    subtipo: textoOpcional,
    alias: texto.min(1, { error: "validacion.nombre_obligatorio" }),
    calle: textoOpcional,
    numero: textoOpcional,
    piso: textoOpcional,
    departamento: textoOpcional,
    localidad: textoOpcional,
    provincia: textoOpcional,
    codigoPostal: textoOpcional,
    latitud: coordenada(-90, 90),
    longitud: coordenada(-180, 180),
    dominio: texto.optional().transform((v) => (v ? normalizarDominio(v) : null)),
    marcaModelo: textoOpcional,
    anio: z.number().int().min(1900).max(new Date().getFullYear() + 1).nullable().default(null),
    estado: z.string().optional(),
    edificioNombre: textoOpcional,
    edificioExistente: z.boolean().default(false),
    unidadFuncional: textoOpcional,
    observaciones: textoOpcional,
  })
  .superRefine((b, ctx) => {
    const error = (campo: string, mensaje: string) => ctx.addIssue({ code: "custom", path: [campo], message: mensaje });

    if (subtiposDe(b.tipoBien).length > 0 && (!b.subtipo || !subtiposDe(b.tipoBien).includes(b.subtipo))) {
      error("subtipo", "validacion.subtipo_obligatorio");
    }
    // Las coordenadas van juntas o no van (bien_coordenadas_ck).
    if ((b.latitud === null) !== (b.longitud === null)) error("latitud", "validacion.coordenadas_incompletas");

    if (tieneDireccion(b.tipoBien)) {
      // Un inmueble en un edificio cargado hereda su dirección (PROP-04).
      const hereda = b.tipoBien === "inmueble" && b.edificioExistente && b.edificioNombre !== null;
      if (!hereda) {
        if (!b.calle) error("calle", "validacion.dato_obligatorio");
        if (!b.numero) error("numero", "validacion.dato_obligatorio");
        if (!b.localidad) error("localidad", "validacion.dato_obligatorio");
        if (!b.provincia) error("provincia", "validacion.dato_obligatorio");
      }
    }
    if (b.tipoBien === "vehiculo" && !b.dominio) error("dominio", "validacion.dominio_obligatorio");
    if (b.estado && !ESTADOS_POR_TIPO[b.tipoBien].includes(b.estado)) error("estado", "validacion.dato_obligatorio");
  });

export type DatosBien = z.output<typeof esquemaBien>;

// ---------------------------------------------------------------- ubicación (PROP-09)

export interface Ubicacion {
  latitud: number | null;
  longitud: number | null;
  calle?: string | null;
  numero?: string | null;
  localidad?: string | null;
  provincia?: string | null;
}

/** Con coordenadas abre el punto exacto; sin ellas, busca por la dirección. Sin ninguna, no hay enlace. */
export function enlaceGoogleMaps(u: Ubicacion): string | null {
  if (u.latitud !== null && u.longitud !== null) {
    return `https://www.google.com/maps?q=${u.latitud},${u.longitud}`;
  }
  const direccion = [[u.calle, u.numero].filter(Boolean).join(" "), u.localidad, u.provincia, "Argentina"]
    .filter(Boolean)
    .join(", ");
  if (!u.calle) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`;
}

/** Dirección en una línea: "Caseros 681, piso 3, depto B, Córdoba, Córdoba". */
export function formatearDireccion(u: {
  calle?: string | null;
  numero?: string | null;
  piso?: string | null;
  departamento?: string | null;
  localidad?: string | null;
  provincia?: string | null;
}): string {
  const calle = [u.calle, u.numero].filter(Boolean).join(" ");
  const unidad = [u.piso && `piso ${u.piso}`, u.departamento && `depto ${u.departamento}`].filter(Boolean).join(", ");
  return [calle, unidad, u.localidad, u.provincia].filter(Boolean).join(", ");
}

// ---------------------------------------------------------------- titularidad (CON-01)

export type EstadoTitularidad = "completa" | "parcial" | "excedida" | "vacia";

/**
 * CON-01: los porcentajes cargados no pueden superar 100 %. Pueden sumar menos (los cotitulares
 * que no se administran no se cargan). Sin titulares, el bien está incompleto.
 */
export function estadoTitularidad(porcentajes: readonly number[]): EstadoTitularidad {
  if (porcentajes.length === 0) return "vacia";
  const suma = Math.round(porcentajes.reduce((a, b) => a + b, 0) * 10000);
  if (suma > 1_000_000) return "excedida";
  return suma === 1_000_000 ? "completa" : "parcial";
}

/** Porcentaje que todavía se puede asignar a un nuevo titular. */
export function porcentajeDisponible(porcentajes: readonly number[]): number {
  const suma = Math.round(porcentajes.reduce((a, b) => a + b, 0) * 10000);
  return Math.max(0, (1_000_000 - suma) / 10000);
}

export const esquemaTitular = z.object({
  propietarioId: z.string().min(1, { error: "validacion.dato_obligatorio" }),
  porcentaje: z
    .number({ error: "validacion.porcentaje_invalido" })
    .gt(0, { error: "validacion.porcentaje_invalido" })
    .max(100, { error: "validacion.porcentaje_invalido" }),
});
