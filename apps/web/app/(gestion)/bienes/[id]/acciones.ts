"use server";

import { revalidatePath } from "next/cache";
import {
  contratoVigente,
  ESTADOS_POR_TIPO,
  generarUuidV7,
  impedimentosDeVenta,
  puedeQuitarTitular,
  representanteTrasQuitar,
  validarModoLiquidacion,
  validarPorcentajeTitular,
  type ErrorTitularidad,
  type ModoLiquidacion,
  type TipoBien,
  type TitularBasico,
} from "@ai/domain";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { usuarioActual } from "@/lib/usuario-actual";

export interface ResultadoTitulares {
  /** Clave de texto del error, si lo hubo. */
  error?: string;
  /** Motivos que impiden el cambio de estado (PROP-03), como claves de texto. */
  impedimentos?: string[];
}

type Cliente = Awaited<ReturnType<typeof crearClienteServidor>>;

const MENSAJES: Record<ErrorTitularidad, string> = {
  excede: "titulares.error_excede",
  ultimo_titular: "titulares.error_ultimo",
  sin_representante: "titulares.error_sin_representante",
  sin_propietario: "titulares.error_sin_propietario",
  porcentaje_invalido: "titulares.error_porcentaje",
  repetido: "titulares.error_repetido",
};

// Los titulares y el modo de liquidación los modifica solo el administrador (P-18).
async function exigirAdministrador() {
  const { usuario } = await usuarioActual();
  return usuario?.roles.includes("administrador") ? usuario : null;
}

async function titularesActuales(supabase: Cliente, bienId: string): Promise<TitularBasico[]> {
  const { data } = await supabase
    .from("bien_propietario")
    .select("id, propietario_id, porcentaje, es_representante")
    .eq("bien_id", bienId)
    .is("deleted_at", null);
  return (data ?? []).map((v) => ({
    id: v.id as string,
    propietarioId: v.propietario_id as string,
    porcentaje: Number(v.porcentaje),
    esRepresentante: Boolean(v.es_representante),
  }));
}

const refrescar = (bienId: string) => {
  revalidatePath(`/bienes/${bienId}`);
  revalidatePath("/bienes");
};

export async function agregarTitular(bienId: string, propietarioId: string, porcentaje: number): Promise<ResultadoTitulares> {
  const usuario = await exigirAdministrador();
  if (!usuario) return { error: "titulares.solo_administrador" };
  const supabase = await crearClienteServidor();

  const { data: yaEs } = await supabase
    .from("bien_propietario")
    .select("id")
    .eq("bien_id", bienId)
    .eq("propietario_id", propietarioId)
    .is("deleted_at", null)
    .maybeSingle();
  if (yaEs) return { error: MENSAJES.repetido };

  const actuales = await titularesActuales(supabase, bienId);
  const error = validarPorcentajeTitular(actuales, porcentaje);
  if (error) return { error: MENSAJES[error] };

  const { error: errorBase } = await supabase.from("bien_propietario").insert({
    id: generarUuidV7(),
    organizacion_id: usuario.organizacionId,
    bien_id: bienId,
    propietario_id: propietarioId,
    porcentaje,
    // El primer titular es el representante; los siguientes no.
    es_representante: actuales.length === 0,
  });
  if (errorBase) return { error: "titulares.error_generico" };
  refrescar(bienId);
  return {};
}

export async function cambiarPorcentaje(bienId: string, vinculoId: string, porcentaje: number): Promise<ResultadoTitulares> {
  if (!(await exigirAdministrador())) return { error: "titulares.solo_administrador" };
  const supabase = await crearClienteServidor();
  const error = validarPorcentajeTitular(await titularesActuales(supabase, bienId), porcentaje, vinculoId);
  if (error) return { error: MENSAJES[error] };
  const { error: errorBase } = await supabase.from("bien_propietario").update({ porcentaje }).eq("id", vinculoId).eq("bien_id", bienId);
  if (errorBase) return { error: "titulares.error_generico" };
  refrescar(bienId);
  return {};
}

export async function quitarTitular(bienId: string, vinculoId: string): Promise<ResultadoTitulares> {
  if (!(await exigirAdministrador())) return { error: "titulares.solo_administrador" };
  const supabase = await crearClienteServidor();
  const actuales = await titularesActuales(supabase, bienId);
  if (!puedeQuitarTitular(actuales.length)) return { error: MENSAJES.ultimo_titular };

  // Si se quita al representante, el cargo pasa al titular con mayor porcentaje (CON-04).
  const nuevoRepresentante = representanteTrasQuitar(actuales, vinculoId);
  const quitado = actuales.find((t) => t.id === vinculoId);
  const quitaba = quitado?.esRepresentante;
  const { error } = await supabase
    .from("bien_propietario")
    .update({ deleted_at: new Date().toISOString(), es_representante: false })
    .eq("id", vinculoId)
    .eq("bien_id", bienId);
  if (error) return { error: "titulares.error_generico" };
  if (quitaba && nuevoRepresentante) {
    await supabase.from("bien_propietario").update({ es_representante: true }).eq("id", nuevoRepresentante);
  }
  // Si el bien se liquidaba a nombre del titular que se quita, vuelve a liquidarse por separado.
  await supabase
    .from("bien")
    .update({ modo_liquidacion: "por_separado", propietario_liquidacion_id: null })
    .eq("id", bienId)
    .eq("propietario_liquidacion_id", quitado?.propietarioId ?? "");
  refrescar(bienId);
  return {};
}

export async function marcarRepresentante(bienId: string, vinculoId: string): Promise<ResultadoTitulares> {
  if (!(await exigirAdministrador())) return { error: "titulares.solo_administrador" };
  const supabase = await crearClienteServidor();
  const actuales = await titularesActuales(supabase, bienId);
  if (!actuales.some((t) => t.id === vinculoId)) return { error: "titulares.error_generico" };
  const anteriores = actuales.filter((t) => t.esRepresentante && t.id !== vinculoId).map((t) => t.id);
  if (anteriores.length) {
    const { error } = await supabase.from("bien_propietario").update({ es_representante: false }).in("id", anteriores);
    if (error) return { error: "titulares.error_generico" };
  }
  const { error } = await supabase.from("bien_propietario").update({ es_representante: true }).eq("id", vinculoId);
  if (error) return { error: "titulares.error_generico" };
  refrescar(bienId);
  return {};
}

export async function cambiarModoLiquidacion(
  bienId: string,
  modo: ModoLiquidacion,
  propietarioId: string | null = null,
): Promise<ResultadoTitulares> {
  if (!(await exigirAdministrador())) return { error: "titulares.solo_administrador" };
  const supabase = await crearClienteServidor();
  const error = validarModoLiquidacion(modo, await titularesActuales(supabase, bienId), propietarioId);
  if (error) return { error: MENSAJES[error] };
  const { error: errorBase } = await supabase
    .from("bien")
    .update({ modo_liquidacion: modo, propietario_liquidacion_id: modo === "a_propietario" ? propietarioId : null })
    .eq("id", bienId);
  if (errorBase) return { error: "titulares.error_generico" };
  refrescar(bienId);
  return {};
}

const ESTADOS_PENDIENTES = ["a_completar", "pendiente", "vencida"];
const fechaHoy = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Argentina/Cordoba" }).format(new Date());

// PROP-02 / PROP-03: el estado se cambia a mano. Vendido exige no tener obligaciones pendientes
// a cargo del propietario ni contrato vigente.
export async function cambiarEstadoBien(bienId: string, estado: string): Promise<ResultadoTitulares> {
  const { usuario } = await usuarioActual();
  if (!usuario) return { error: "estado.error" };
  const supabase = await crearClienteServidor();

  const { data: bien } = await supabase.from("bien").select("tipo_bien, es_gastos_varios").eq("id", bienId).maybeSingle();
  if (!bien) return { error: "estado.error" };
  if (bien.es_gastos_varios) return { error: "estado.gastos_varios" };
  if (!ESTADOS_POR_TIPO[bien.tipo_bien as TipoBien]?.includes(estado)) return { error: "estado.error" };

  if (estado === "vendido") {
    const { data: obligaciones } = await supabase.from("obligacion").select("id").eq("bien_id", bienId).eq("responsable", "propietario");
    const ids = (obligaciones ?? []).map((o) => o.id as string);
    const { data: estados } = ids.length
      ? await supabase.from("obligacion_estado").select("estado").in("obligacion_id", ids)
      : { data: [] as { estado: string }[] };
    const obligacionesPendientes = (estados ?? []).filter((e) => ESTADOS_PENDIENTES.includes(e.estado)).length;

    const { data: contratos } = await supabase
      .from("contrato")
      .select("fecha_inicio, fecha_fin, rescision_fecha")
      .eq("bien_id", bienId)
      .is("deleted_at", null);
    const hoy = fechaHoy();
    const contratosVigentes = (contratos ?? []).filter((c) =>
      contratoVigente(
        {
          fechaInicio: (c.fecha_inicio as string | null) ?? null,
          fechaFin: (c.fecha_fin as string | null) ?? null,
          rescisionFecha: (c.rescision_fecha as string | null) ?? null,
        },
        hoy,
      ),
    ).length;

    const motivos = impedimentosDeVenta({ obligacionesPendientes, contratosVigentes });
    if (motivos.length) return { impedimentos: motivos.map((m) => `estado.impide_${m}`) };
  }

  const { error } = await supabase.from("bien").update({ estado }).eq("id", bienId);
  if (error) return { error: "estado.error" };
  refrescar(bienId);
  return {};
}
