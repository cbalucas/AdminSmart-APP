import { cache } from "react";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export interface Titular {
  vinculoId: string;
  propietarioId: string;
  nombre: string;
  porcentaje: number;
  esRepresentante: boolean;
}

export interface Edificio {
  id: string;
  nombre: string;
  calle: string;
  numero: string;
  localidad: string;
  provincia: string;
  codigoPostal: string | null;
}

export interface Bien {
  id: string;
  tipoBien: string;
  subtipo: string | null;
  alias: string;
  calle: string | null;
  numero: string | null;
  piso: string | null;
  departamento: string | null;
  localidad: string | null;
  provincia: string | null;
  codigoPostal: string | null;
  latitud: number | null;
  longitud: number | null;
  dominio: string | null;
  marcaModelo: string | null;
  anio: number | null;
  estado: string;
  edificioId: string | null;
  unidadFuncional: string | null;
  modoLiquidacion: string;
  esGastosVarios: boolean;
  observaciones: string | null;
}

const aBien = (b: Record<string, unknown>): Bien => ({
  id: b.id as string,
  tipoBien: b.tipo_bien as string,
  subtipo: (b.subtipo as string | null) ?? null,
  alias: b.alias as string,
  calle: (b.calle as string | null) ?? null,
  numero: (b.numero as string | null) ?? null,
  piso: (b.piso as string | null) ?? null,
  departamento: (b.departamento as string | null) ?? null,
  localidad: (b.localidad as string | null) ?? null,
  provincia: (b.provincia as string | null) ?? null,
  codigoPostal: (b.codigo_postal as string | null) ?? null,
  latitud: b.latitud === null || b.latitud === undefined ? null : Number(b.latitud),
  longitud: b.longitud === null || b.longitud === undefined ? null : Number(b.longitud),
  dominio: (b.dominio as string | null) ?? null,
  marcaModelo: (b.marca_modelo as string | null) ?? null,
  anio: (b.anio as number | null) ?? null,
  estado: b.estado as string,
  edificioId: (b.edificio_id as string | null) ?? null,
  unidadFuncional: (b.unidad_funcional as string | null) ?? null,
  modoLiquidacion: b.modo_liquidacion as string,
  esGastosVarios: Boolean(b.es_gastos_varios),
  observaciones: (b.observaciones as string | null) ?? null,
});

const aEdificio = (e: Record<string, unknown>): Edificio => ({
  id: e.id as string,
  nombre: e.nombre as string,
  calle: e.calle as string,
  numero: e.numero as string,
  localidad: e.localidad as string,
  provincia: e.provincia as string,
  codigoPostal: (e.codigo_postal as string | null) ?? null,
});

// Los edificios cargados, para sugerirlos y heredar su dirección (PROP-04).
export const listarEdificios = cache(async (): Promise<Edificio[]> => {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.from("edificio").select("*").is("deleted_at", null).order("nombre");
  return (data ?? []).map(aEdificio);
});

// Un bien por id; la base filtra según lo que el usuario puede ver (RLS).
export const obtenerBien = cache(async (id: string): Promise<Bien | null> => {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await crearClienteServidor();
  const { data } = await supabase.from("bien").select("*").eq("id", id).is("deleted_at", null).maybeSingle();
  return data ? aBien(data) : null;
});

export const listarBienes = cache(async (): Promise<Bien[]> => {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.from("bien").select("*").is("deleted_at", null).order("alias");
  return (data ?? []).map(aBien);
});

// Titulares de varios bienes a la vez: bienId → titulares.
export async function titularesDe(bienIds: string[]): Promise<Map<string, Titular[]>> {
  const mapa = new Map<string, Titular[]>();
  if (bienIds.length === 0) return mapa;
  const supabase = await crearClienteServidor();
  const { data: vinculos } = await supabase
    .from("bien_propietario")
    .select("id, bien_id, propietario_id, porcentaje, es_representante")
    .in("bien_id", bienIds)
    .is("deleted_at", null);
  const propietarioIds = [...new Set((vinculos ?? []).map((v) => v.propietario_id as string))];
  const { data: propietarios } = propietarioIds.length
    ? await supabase.from("propietario").select("id, nombre_razon_social").in("id", propietarioIds)
    : { data: [] as Record<string, unknown>[] };
  const nombreDe = new Map((propietarios ?? []).map((p) => [p.id as string, p.nombre_razon_social as string]));
  for (const v of vinculos ?? []) {
    const lista = mapa.get(v.bien_id as string) ?? [];
    lista.push({
      vinculoId: v.id as string,
      propietarioId: v.propietario_id as string,
      nombre: nombreDe.get(v.propietario_id as string) ?? "—",
      porcentaje: Number(v.porcentaje),
      esRepresentante: Boolean(v.es_representante),
    });
    mapa.set(v.bien_id as string, lista);
  }
  for (const lista of mapa.values()) lista.sort((a, b) => b.porcentaje - a.porcentaje || a.nombre.localeCompare(b.nombre));
  return mapa;
}

export const formatearPorcentaje = (p: number) => String(p).replace(".", ",");
