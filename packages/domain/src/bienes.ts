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

// ---------------------------------------------------------------- titulares: operaciones (P-18)

export interface TitularBasico {
  id: string;
  propietarioId?: string;
  porcentaje: number;
  esRepresentante: boolean;
}

export type ErrorTitularidad =
  | "excede"
  | "ultimo_titular"
  | "sin_representante"
  | "sin_propietario"
  | "porcentaje_invalido"
  | "repetido";

export type ModoLiquidacion = "por_separado" | "al_representante" | "a_propietario";
export const MODOS_LIQUIDACION: readonly ModoLiquidacion[] = ["por_separado", "al_representante", "a_propietario"];

/** CON-01: al agregar o cambiar un titular, la suma no puede superar 100 %. */
export function validarPorcentajeTitular(
  actuales: readonly TitularBasico[],
  porcentaje: number,
  excluirId?: string,
): ErrorTitularidad | null {
  if (!(porcentaje > 0 && porcentaje <= 100)) return "porcentaje_invalido";
  const otros = actuales.filter((t) => t.id !== excluirId).map((t) => t.porcentaje);
  return estadoTitularidad([...otros, porcentaje]) === "excedida" ? "excede" : null;
}

/** Un bien no puede quedar sin titulares: el último no se quita. */
export const puedeQuitarTitular = (cantidad: number): boolean => cantidad > 1;

/**
 * Al quitar al representante, el cargo pasa al titular con mayor porcentaje que queda
 * (empate: el primero de la lista). Si quitás a otro titular, el representante no cambia.
 */
export function representanteTrasQuitar(actuales: readonly TitularBasico[], quitadoId: string): string | null {
  const restantes = actuales.filter((t) => t.id !== quitadoId);
  if (restantes.length === 0) return null;
  const actual = restantes.find((t) => t.esRepresentante);
  if (actual) return actual.id;
  return restantes.reduce((mejor, t) => (t.porcentaje > mejor.porcentaje ? t : mejor)).id;
}

/**
 * Cómo se liquida el bien:
 * - Por separado: cada titular recibe su liquidación por su porcentaje.
 * - Al representante (CON-04): exactamente un representante recibe una sola liquidación.
 * - A un propietario: una sola liquidación a nombre de un titular elegido (`propietarioId`).
 */
export function validarModoLiquidacion(
  modo: ModoLiquidacion,
  titulares: readonly TitularBasico[],
  propietarioId?: string | null,
): ErrorTitularidad | null {
  if (modo === "al_representante") {
    return titulares.filter((t) => t.esRepresentante).length === 1 ? null : "sin_representante";
  }
  if (modo === "a_propietario") {
    return propietarioId && titulares.some((t) => t.propietarioId === propietarioId) ? null : "sin_propietario";
  }
  return null;
}

// ---------------------------------------------------------------- estado del bien (PROP-03)

export interface FechasContrato {
  fechaInicio: string | null; // AAAA-MM-DD
  fechaFin: string | null;
  rescisionFecha: string | null;
}

/** Un contrato está vigente si ya empezó, no terminó y no fue rescindido. `hoy` es AAAA-MM-DD. */
export function contratoVigente(c: FechasContrato, hoy: string): boolean {
  if (c.fechaInicio !== null && c.fechaInicio > hoy) return false;
  if (c.fechaFin !== null && c.fechaFin < hoy) return false;
  if (c.rescisionFecha !== null && c.rescisionFecha <= hoy) return false;
  return true;
}

/** PROP-03: no pasa a Vendido con obligaciones pendientes a cargo del propietario o con contrato vigente. */
export function impedimentosDeVenta(m: {
  obligacionesPendientes: number;
  contratosVigentes: number;
}): ("obligaciones" | "contrato")[] {
  const motivos: ("obligaciones" | "contrato")[] = [];
  if (m.obligacionesPendientes > 0) motivos.push("obligaciones");
  if (m.contratosVigentes > 0) motivos.push("contrato");
  return motivos;
}
