import { enlaceDelLogo, obtenerAdministracion } from "@/lib/administracion";
import {
  calcularResumenDelPropietario,
  historialDeResumenes,
  type FilaHistorial,
  type ResumenDelPropietario,
} from "@/lib/resumen-deposito";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export interface BienDelPropietario {
  id: string;
  alias: string;
  tipoBien: string;
  estado: string;
  esGastosVarios: boolean;
  porcentaje: number;
}

export interface DatosHomePropietario {
  resumen: ResumenDelPropietario;
  bienes: BienDelPropietario[];
  historial: FilaHistorial[];
  administracion: string;
  logoUrl: string | null;
}

// P-08 Home del propietario. Todo se lee con la sesión del propietario: la base solo devuelve lo suyo (RLS).
export async function datosHomePropietario(propietarioId: string): Promise<DatosHomePropietario | null> {
  const supabase = await crearClienteServidor();
  const [resumen, historial, admin, { data: vinculos }] = await Promise.all([
    calcularResumenDelPropietario(propietarioId),
    historialDeResumenes(propietarioId),
    obtenerAdministracion(),
    supabase.from("bien_propietario").select("bien_id, porcentaje").eq("propietario_id", propietarioId).is("deleted_at", null),
  ]);
  if (!resumen) return null;

  const ids = (vinculos ?? []).map((v) => v.bien_id as string);
  const { data: bienes } = ids.length
    ? await supabase.from("bien").select("id, alias, tipo_bien, estado, es_gastos_varios").in("id", ids).is("deleted_at", null)
    : { data: [] as Record<string, unknown>[] };
  const porcentaje = new Map((vinculos ?? []).map((v) => [v.bien_id as string, Number(v.porcentaje)]));

  return {
    resumen,
    historial,
    administracion: admin?.nombre ?? "",
    logoUrl: await enlaceDelLogo(admin?.logoPath ?? null),
    bienes: (bienes ?? [])
      .map((b) => ({
        id: b.id as string,
        alias: b.alias as string,
        tipoBien: b.tipo_bien as string,
        estado: b.estado as string,
        esGastosVarios: Boolean(b.es_gastos_varios),
        porcentaje: porcentaje.get(b.id as string) ?? 0,
      }))
      .sort((a, b) => Number(a.esGastosVarios) - Number(b.esGastosVarios) || a.alias.localeCompare(b.alias)),
  };
}
