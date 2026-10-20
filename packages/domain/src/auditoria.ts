// Auditoría (P-45, SEG-05): resumen legible de cada cambio registrado por el disparador de la base.
import { formatearImporte, type Moneda } from "./dinero";

/** Campos internos que no aportan a quien lee la auditoría. */
const CAMPOS_TECNICOS = new Set(["id", "organizacion_id", "created_at", "updated_at", "version"]);

/** Campos guardados en centavos: se muestran como importe en la moneda del mismo registro. */
const CAMPOS_EN_CENTAVOS = new Set([
  "monto", "importe", "debe", "haber", "monto_estimado", "obligaciones_pendientes", "saldo_disponible",
  "reposicion_fondo", "a_depositar", "saldo_a_transferir", "fondo_reserva_ars", "fondo_reserva_usd",
  "importe_origen", "importe_destino", "monto_fijo",
]);

export type Valores = Record<string, unknown> | null | undefined;

export interface CambioDeCampo {
  campo: string;
  antes: unknown;
  despues: unknown;
}

/** En un alta se muestran primero los datos que mejor identifican el registro. */
const PRIORIDAD_EN_ALTA = ["descripcion", "alias", "nombre", "nombre_razon_social", "numero", "concepto_id", "tipo", "monto", "importe", "haber", "debe", "moneda", "periodo", "fecha", "vencimiento"];

const igual = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * Campos que cambiaron entre dos versiones de un registro. En un alta (sin valores anteriores) lista los campos
 * cargados (sin los vacíos ni los importes en cero), primero los que identifican el registro. Se omiten los campos internos (id, versión, fechas de sistema).
 */
export function cambiosDeCampos(antes: Valores, despues: Valores): CambioDeCampo[] {
  const nuevo = despues ?? {};
  const viejo = antes ?? {};
  const campos = [...new Set([...Object.keys(viejo), ...Object.keys(nuevo)])].filter((c) => !CAMPOS_TECNICOS.has(c));
  const lista: CambioDeCampo[] = [];
  for (const campo of campos) {
    const a = viejo[campo] ?? null;
    const d = nuevo[campo] ?? null;
    if (antes ? !igual(a, d) : d !== null && d !== "" && d !== 0 && !(Array.isArray(d) && d.length === 0) && d !== false) lista.push({ campo, antes: a, despues: d });
  }
  if (!antes) {
    const orden = (c: string) => (PRIORIDAD_EN_ALTA.includes(c) ? PRIORIDAD_EN_ALTA.indexOf(c) : PRIORIDAD_EN_ALTA.length);
    lista.sort((x, y) => orden(x.campo) - orden(y.campo));
  }
  return lista;
}

const FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;
const FECHA_HORA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

/** Texto de un valor para la pantalla o el Excel de auditoría. */
export function formatearValorAuditoria(campo: string, valor: unknown, moneda?: unknown): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  if (typeof valor === "boolean") return valor ? "Sí" : "No";
  if (typeof valor === "number" && CAMPOS_EN_CENTAVOS.has(campo)) return formatearImporte(Math.round(valor), moneda === "USD" ? "USD" : ("ARS" as Moneda));
  if (typeof valor === "string") {
    const f = FECHA.exec(valor);
    if (f) return `${f[3]}/${f[2]}/${f[1]}`;
    if (FECHA_HORA.test(valor)) {
      const d = new Date(valor);
      if (!Number.isNaN(d.getTime())) return new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Argentina/Cordoba" }).format(d);
    }
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor)) return `${valor.slice(0, 8)}…`;
    return valor;
  }
  if (typeof valor === "object") return JSON.stringify(valor);
  return String(valor);
}

/** Cómo nombrar un registro: su nombre, alias, número o descripción, según la tabla. */
export function descripcionDelRegistro(valores: Valores): string {
  const v = valores ?? {};
  for (const campo of ["nombre_razon_social", "alias", "nombre", "numero", "descripcion", "email"]) {
    const x = v[campo];
    if (typeof x === "string" && x.trim() !== "") return x;
  }
  return "";
}

/** "bien_servicio" → "bien servicio": respaldo cuando un campo no tiene texto propio. */
export const humanizarCampo = (campo: string) => campo.replace(/_/g, " ");

/** Tablas cuyo registro de auditoría nunca se apaga: el dinero, los usuarios y la configuración de la administración. */
export const TABLAS_SIEMPRE_AUDITADAS = [
  "organizacion", "usuario", "usuario_bien", "movimiento", "pago", "cobro_alquiler",
  "resumen_deposito", "resumen_deposito_monto", "liquidacion", "liquidacion_total",
] as const;

/**
 * AUD-04: ¿se registra este cambio? Copia, para documentarla y probarla, la regla que aplica el disparador de la base.
 * Siempre se audita lo que mueve dinero; el resto, si la auditoría general está activa y el registro no pertenece a
 * propietarios o, si pertenece, al menos uno de ellos la tiene activa.
 */
export function debeAuditar(args: { tabla: string; auditoriaActiva: boolean; propietarios: { auditar: boolean }[] }): boolean {
  if ((TABLAS_SIEMPRE_AUDITADAS as readonly string[]).includes(args.tabla)) return true;
  if (!args.auditoriaActiva) return false;
  if (args.propietarios.length === 0) return true;
  return args.propietarios.some((p) => p.auditar);
}
