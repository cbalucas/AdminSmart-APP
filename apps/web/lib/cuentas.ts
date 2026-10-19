import { cache } from "react";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export interface CuentaDelPropietario {
  /** Id del vínculo propietario-cuenta. */
  vinculoId: string;
  cuentaId: string;
  predeterminada: boolean;
  banco: string | null;
  tipoCuenta: string;
  moneda: "ARS" | "USD";
  cbuCvu: string | null;
  alias: string | null;
  titular: string;
  estado: string;
  /** Otros propietarios que comparten la cuenta. */
  compartidaCon: string[];
}

export interface CuentaDisponible {
  id: string;
  etiqueta: string;
}

// Solo el administrador ve cuentas bancarias (la base lo hace cumplir); quien no lo es recibe listas vacías.
export const obtenerCuentas = cache(async (propietarioId: string) => {
  const supabase = await crearClienteServidor();
  const { data: vinculos } = await supabase
    .from("propietario_cuenta")
    .select("id, cuenta_bancaria_id, predeterminada")
    .eq("propietario_id", propietarioId)
    .is("deleted_at", null);
  const ids = (vinculos ?? []).map((v) => v.cuenta_bancaria_id as string);

  const [{ data: cuentas }, { data: otros }, { data: todas }] = await Promise.all([
    ids.length
      ? supabase.from("cuenta_bancaria").select("*").in("id", ids).is("deleted_at", null)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    ids.length
      ? supabase
          .from("propietario_cuenta")
          .select("cuenta_bancaria_id, propietario_id")
          .in("cuenta_bancaria_id", ids)
          .neq("propietario_id", propietarioId)
          .is("deleted_at", null)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    supabase
      .from("cuenta_bancaria")
      .select("id, banco, alias, cbu_cvu, titular, moneda")
      .eq("estado", "activo")
      .is("deleted_at", null)
      .order("banco"),
  ]);

  const otrosIds = [...new Set((otros ?? []).map((o) => o.propietario_id as string))];
  const { data: nombres } = otrosIds.length
    ? await supabase.from("propietario").select("id, nombre_razon_social").in("id", otrosIds)
    : { data: [] as Record<string, unknown>[] };
  const nombreDe = new Map((nombres ?? []).map((n) => [n.id as string, n.nombre_razon_social as string]));

  const lista: CuentaDelPropietario[] = (vinculos ?? [])
    .map((v) => {
      const c = (cuentas ?? []).find((x) => x.id === v.cuenta_bancaria_id);
      if (!c) return null;
      return {
        vinculoId: v.id as string,
        cuentaId: c.id as string,
        predeterminada: Boolean(v.predeterminada),
        banco: (c.banco as string | null) ?? null,
        tipoCuenta: c.tipo_cuenta as string,
        moneda: c.moneda as "ARS" | "USD",
        cbuCvu: (c.cbu_cvu as string | null) ?? null,
        alias: (c.alias as string | null) ?? null,
        titular: c.titular as string,
        estado: c.estado as string,
        compartidaCon: (otros ?? [])
          .filter((o) => o.cuenta_bancaria_id === c.id)
          .map((o) => nombreDe.get(o.propietario_id as string) ?? "")
          .filter(Boolean),
      };
    })
    .filter((x): x is CuentaDelPropietario => x !== null)
    .sort((a, b) => a.moneda.localeCompare(b.moneda) || (a.banco ?? "").localeCompare(b.banco ?? ""));

  const disponibles: CuentaDisponible[] = (todas ?? [])
    .filter((c) => !ids.includes(c.id as string))
    .map((c) => ({
      id: c.id as string,
      etiqueta: `${[c.banco, c.alias ?? (c.cbu_cvu ? `…${String(c.cbu_cvu).slice(-6)}` : null)].filter(Boolean).join(" · ")} · ${c.titular} (${c.moneda})`,
    }));

  return { cuentas: lista, disponibles };
});

/** CBU en bloques para leerlo mejor: 0170 0099 2000 0000 1234 56 */
export const formatearCbu = (cbu: string) => cbu.replace(/(\d{4})(?=\d)/g, "$1 ");
