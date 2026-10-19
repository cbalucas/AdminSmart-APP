import { cache } from "react";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export interface Telefono { tipo: string; numero: string }
export interface Email { email: string; principal: boolean }

export interface FichaPropietario {
  id: string;
  tipoPersona: string;
  nombre: string;
  telefonos: Telefono[];
  emails: Email[];
  estado: string;
  apoderadoNombre: string | null;
  apoderadoContacto: string | null;
  periodicidadLiquidacion: string;
  diaLiquidacion: number | null;
  horizonteResumenDias: number;
  fondoReservaArs: number | null;
  fondoReservaUsd: number | null;
  observaciones: string | null;
  avatarPath: string | null;
}

// Un propietario por id; la base filtra según lo que el usuario puede ver (RLS).
export const obtenerPropietario = cache(async (id: string): Promise<FichaPropietario | null> => {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await crearClienteServidor();
  const { data: p } = await supabase.from("propietario").select("*").eq("id", id).is("deleted_at", null).maybeSingle();
  if (!p) return null;
  return {
    id: p.id,
    tipoPersona: p.tipo_persona,
    nombre: p.nombre_razon_social,
    telefonos: (p.telefonos ?? []) as Telefono[],
    emails: (p.emails ?? []) as Email[],
    estado: p.estado,
    apoderadoNombre: p.apoderado_nombre,
    apoderadoContacto: p.apoderado_contacto,
    periodicidadLiquidacion: p.periodicidad_liquidacion,
    diaLiquidacion: p.dia_liquidacion,
    horizonteResumenDias: p.horizonte_resumen_dias,
    fondoReservaArs: p.fondo_reserva_ars === null ? null : Number(p.fondo_reserva_ars),
    fondoReservaUsd: p.fondo_reserva_usd === null ? null : Number(p.fondo_reserva_usd),
    observaciones: p.observaciones,
    avatarPath: p.avatar_path ?? null,
  };
});
