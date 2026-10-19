"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { estadoInicial, generarUuidV7, type DatosBien } from "@ai/domain";
import { aFilaBien, leerFormularioBien, leerTitularInicial, type EstadoFormularioBien } from "@/lib/formulario-bien";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { usuarioActual } from "@/lib/usuario-actual";

type Cliente = Awaited<ReturnType<typeof crearClienteServidor>>;

const buscarEdificio = async (supabase: Cliente, nombre: string | null) => {
  if (!nombre) return null;
  const { data } = await supabase.from("edificio").select("id, nombre").is("deleted_at", null);
  return (data ?? []).find((e) => (e.nombre as string).trim().toLowerCase() === nombre.trim().toLowerCase()) ?? null;
};

// PROP-01 (alias) y dominio únicos: se avisa antes de que la base lo rechace.
async function duplicados(supabase: Cliente, d: DatosBien, excluirId?: string): Promise<Record<string, string>> {
  const errores: Record<string, string> = {};
  const consultas: [string, string | null, string][] = [
    ["alias", d.alias, "bienes.alias_repetido"],
    ["dominio", d.dominio, "bienes.dominio_repetido"],
  ];
  for (const [columna, valor, mensaje] of consultas) {
    if (!valor) continue;
    // ilike sin comodines: se escapan % y _ para comparar el texto tal cual.
    let q = supabase
      .from("bien")
      .select("id")
      .ilike(columna, valor.replace(/[\\%_]/g, (c) => `\\${c}`))
      .is("deleted_at", null);
    if (excluirId) q = q.neq("id", excluirId);
    const { data } = await q.limit(1);
    if (data?.length) errores[columna] = mensaje;
  }
  return errores;
}

// Resuelve el edificio escrito: uno ya cargado se reutiliza (el bien hereda su dirección, PROP-04);
// uno nuevo se crea con la dirección del propio bien.
async function resolverEdificio(supabase: Cliente, d: DatosBien, organizacionId: string, existente: { id: string } | null) {
  if (d.tipoBien !== "inmueble" || !d.edificioNombre) return { id: null as string | null, falla: false };
  if (existente) return { id: existente.id, falla: false };
  const id = generarUuidV7();
  const { error } = await supabase.from("edificio").insert({
    id,
    organizacion_id: organizacionId,
    nombre: d.edificioNombre,
    calle: d.calle,
    numero: d.numero,
    localidad: d.localidad,
    provincia: d.provincia,
    codigo_postal: d.codigoPostal,
  });
  return error ? { id: null as string | null, falla: true } : { id, falla: false };
}

// P-17 Alta de bien, con su primer titular.
export async function crearBien(_a: EstadoFormularioBien, formulario: FormData): Promise<EstadoFormularioBien> {
  const { usuario } = await usuarioActual();
  if (!usuario) return { error: "bienes.error_guardar" };
  const supabase = await crearClienteServidor();

  const nombreEdificio = String(formulario.get("edificioNombre") ?? "").trim();
  const existente = await buscarEdificio(supabase, nombreEdificio || null);
  const leido = leerFormularioBien(formulario, Boolean(existente));
  const titular = leerTitularInicial(formulario);
  if (!leido.ok || !titular.ok) {
    return { errores: { ...(leido.ok ? {} : leido.errores), ...(titular.ok ? {} : titular.errores) } };
  }
  const datos = { ...leido.datos, estado: leido.datos.estado ?? estadoInicial(leido.datos.tipoBien) };

  const repetidos = await duplicados(supabase, datos);
  if (Object.keys(repetidos).length) return { errores: repetidos };

  const edificio = await resolverEdificio(supabase, datos, usuario.organizacionId, existente);
  if (edificio.falla) return { error: "bienes.error_guardar" };

  const id = generarUuidV7();
  const { error } = await supabase
    .from("bien")
    .insert({ id, organizacion_id: usuario.organizacionId, ...aFilaBien(datos, edificio.id) });
  if (error) return { error: "bienes.error_guardar" };

  const { error: errorTitular } = await supabase.from("bien_propietario").insert({
    id: generarUuidV7(),
    organizacion_id: usuario.organizacionId,
    bien_id: id,
    propietario_id: titular.datos.propietarioId,
    porcentaje: titular.datos.porcentaje,
    es_representante: true,
  });
  if (errorTitular) {
    // Sin titular el bien no sirve: se da de baja lógica para no dejarlo a medias.
    await supabase.from("bien").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    return { error: "bienes.error_guardar" };
  }

  revalidatePath("/bienes");
  redirect(`/bienes/${id}`);
}

// P-17 Edición de bien (el tipo no cambia).
export async function actualizarBien(
  id: string,
  _a: EstadoFormularioBien,
  formulario: FormData,
): Promise<EstadoFormularioBien> {
  const { usuario } = await usuarioActual();
  if (!usuario) return { error: "bienes.error_guardar" };
  const supabase = await crearClienteServidor();

  const nombreEdificio = String(formulario.get("edificioNombre") ?? "").trim();
  const existente = await buscarEdificio(supabase, nombreEdificio || null);
  const leido = leerFormularioBien(formulario, Boolean(existente));
  if (!leido.ok) return { errores: leido.errores };
  const datos = leido.datos;

  const repetidos = await duplicados(supabase, datos, id);
  if (Object.keys(repetidos).length) return { errores: repetidos };

  const edificio = await resolverEdificio(supabase, datos, usuario.organizacionId, existente);
  if (edificio.falla) return { error: "bienes.error_guardar" };

  const { tipo_bien: _tipo, ...cambios } = aFilaBien(datos, edificio.id);
  const { error } = await supabase.from("bien").update(cambios).eq("id", id);
  if (error) return { error: "bienes.error_guardar" };

  revalidatePath("/bienes");
  revalidatePath(`/bienes/${id}`);
  redirect(`/bienes/${id}`);
}
