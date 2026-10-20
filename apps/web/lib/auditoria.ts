import { cambiosDeCampos, descripcionDelRegistro, normalizarNombre, type CambioDeCampo } from "@ai/domain";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export interface FiltrosAuditoria {
  q?: string;
  usuario?: string;
  tabla?: string;
  accion?: string;
  desde?: string;
  hasta?: string;
  pagina?: string;
}

export const ACCIONES_AUDITORIA = ["alta", "modificacion", "anulacion", "reapertura"] as const;

/** Tablas que audita el disparador de la base (SEG-05). */
export const TABLAS_AUDITADAS = [
  "obligacion", "pago", "movimiento", "propietario", "bien", "bien_propietario", "bien_servicio", "cuenta_bancaria",
  "propietario_cuenta", "concepto", "resumen_deposito", "documento", "plantilla_envio", "envio", "organizacion", "usuario",
  "usuario_bien", "edificio", "acuerdo_honorarios", "inquilino", "contrato", "canon_tramo", "cobro_alquiler", "liquidacion",
] as const;

export const TAMANO_PAGINA = 50;
export const LIMITE_EXPORTACION = 5000;

export interface FilaAuditoria {
  id: string;
  fecha: string;
  usuarioId: string | null;
  usuario: string | null;
  tabla: string;
  registroId: string;
  accion: string;
  descripcion: string;
  moneda: string | null;
  cambios: CambioDeCampo[];
  antes: unknown;
  despues: unknown;
}

// Inicio y fin del día en la hora de Córdoba (UTC−3).
const inicioDelDia = (f: string) => `${f}T00:00:00-03:00`;
const finDelDia = (f: string) => `${f}T23:59:59.999-03:00`;

// P-45: la base ya limita lo que se ve (AUD-01): el administrador todo, el operador solo lo de sus bienes.
export async function consultarAuditoria(f: FiltrosAuditoria, modo: "pagina" | "todo" = "pagina"): Promise<{ filas: FilaAuditoria[]; total: number; pagina: number; paginas: number }> {
  const supabase = await crearClienteServidor();
  const pagina = Math.max(1, Number(f.pagina) || 1);
  let q = supabase
    .from("auditoria")
    .select("id, fecha, usuario_id, tabla, registro_id, accion, valores_antes, valores_despues", { count: "exact" })
    .order("fecha", { ascending: false });
  if (f.usuario) q = q.eq("usuario_id", f.usuario);
  if (f.q?.trim()) {
    // Buscador por nombre de usuario.
    const buscado = normalizarNombre(f.q);
    const ids = (await usuariosParaFiltro()).filter((u) => normalizarNombre(u.nombre).includes(buscado)).map((u) => u.id);
    q = q.in("usuario_id", ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"]);
  }
  if (f.tabla) q = q.eq("tabla", f.tabla);
  if (f.accion) q = q.eq("accion", f.accion);
  if (f.desde && /^\d{4}-\d{2}-\d{2}$/.test(f.desde)) q = q.gte("fecha", inicioDelDia(f.desde));
  if (f.hasta && /^\d{4}-\d{2}-\d{2}$/.test(f.hasta)) q = q.lte("fecha", finDelDia(f.hasta));
  q = modo === "todo" ? q.range(0, LIMITE_EXPORTACION - 1) : q.range((pagina - 1) * TAMANO_PAGINA, pagina * TAMANO_PAGINA - 1);
  const { data, count } = await q;

  const ids = [...new Set((data ?? []).map((r) => r.usuario_id as string | null).filter((x): x is string => Boolean(x)))];
  const { data: usuarios } = ids.length ? await supabase.from("usuario").select("id, nombre").in("id", ids) : { data: [] as Record<string, unknown>[] };
  const nombre = new Map((usuarios ?? []).map((u) => [u.id as string, u.nombre as string]));

  const filas = (data ?? []).map((r): FilaAuditoria => {
    const antes = (r.valores_antes as Record<string, unknown> | null) ?? null;
    const despues = (r.valores_despues as Record<string, unknown> | null) ?? null;
    return {
      id: r.id as string,
      fecha: r.fecha as string,
      usuarioId: (r.usuario_id as string | null) ?? null,
      usuario: r.usuario_id ? (nombre.get(r.usuario_id as string) ?? null) : null,
      tabla: r.tabla as string,
      registroId: r.registro_id as string,
      accion: r.accion as string,
      descripcion: descripcionDelRegistro(despues ?? antes),
      moneda: ((despues ?? antes)?.moneda as string | undefined) ?? null,
      cambios: cambiosDeCampos(antes, despues),
      antes,
      despues,
    };
  });
  const total = count ?? filas.length;
  return { filas, total, pagina, paginas: Math.max(1, Math.ceil(total / TAMANO_PAGINA)) };
}

/** Usuarios para el filtro (la base devuelve solo los que el usuario puede ver). */
export async function usuariosParaFiltro(): Promise<{ id: string; nombre: string }[]> {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.from("usuario").select("id, nombre").is("deleted_at", null).order("nombre");
  return (data ?? []).map((u) => ({ id: u.id as string, nombre: u.nombre as string }));
}
