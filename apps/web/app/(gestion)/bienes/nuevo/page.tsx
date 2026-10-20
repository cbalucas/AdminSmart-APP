import { notFound } from "next/navigation";
import { t } from "@ai/i18n";
import { TituloConIcono } from "@/components/ElementosFormulario";
import { formatearDireccion } from "@ai/domain";
import { FormularioBien, VALORES_BIEN_NUEVO } from "@/components/FormularioBien";
import { listarEdificios } from "@/lib/bienes";
import { esGestion } from "@/lib/menu";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { usuarioActual } from "@/lib/usuario-actual";
import { crearBien } from "../acciones";

// P-17 Alta de bien.
export default async function NuevoBien() {
  const { usuario } = await usuarioActual();
  if (!usuario || !esGestion(usuario.roles)) notFound();

  const supabase = await crearClienteServidor();
  const [edificios, { data: propietarios }] = await Promise.all([
    listarEdificios(),
    supabase.from("propietario").select("id, nombre_razon_social").eq("estado", "activo").is("deleted_at", null).order("nombre_razon_social"),
  ]);

  return (
    <>
      <TituloConIcono icono="bienes">{t("bienes.alta_titulo")}</TituloConIcono>
      <FormularioBien
        accion={crearBien}
        valores={VALORES_BIEN_NUEVO}
        edificios={edificios.map((e) => ({ id: e.id, nombre: e.nombre, direccion: formatearDireccion(e) }))}
        propietarios={(propietarios ?? []).map((p) => ({ id: p.id as string, nombre: p.nombre_razon_social as string }))}
        cancelarHref="/bienes"
      />
    </>
  );
}
