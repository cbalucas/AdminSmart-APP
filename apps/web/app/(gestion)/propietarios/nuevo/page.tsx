import { notFound } from "next/navigation";
import { t } from "@ai/i18n";
import { TituloConIcono } from "@/components/ElementosFormulario";
import { FormularioPropietario, VALORES_NUEVO } from "@/components/FormularioPropietario";
import { esGestion } from "@/lib/menu";
import { usuarioActual } from "@/lib/usuario-actual";
import { crearPropietario } from "../acciones";

// P-13 Alta de propietario.
export default async function NuevoPropietario() {
  const { usuario } = await usuarioActual();
  if (!usuario || !esGestion(usuario.roles)) notFound();

  return (
    <>
      <TituloConIcono icono="propietarios">{t("propietarios.alta_titulo")}</TituloConIcono>
      <FormularioPropietario accion={crearPropietario} valores={VALORES_NUEVO} cancelarHref="/propietarios" />
    </>
  );
}
