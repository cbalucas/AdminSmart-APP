import Link from "next/link";
import { notFound } from "next/navigation";
import { t } from "@ai/i18n";
import { TituloConIcono } from "@/components/ElementosFormulario";
import { FormularioPreferencias } from "@/components/FormularioPreferencias";
import { obtenerAdministracion } from "@/lib/administracion";
import { usuarioActual } from "@/lib/usuario-actual";

// P-43 Preferencias generales (solo administrador).
export default async function Preferencias() {
  const { usuario } = await usuarioActual();
  if (!usuario?.roles.includes("administrador")) notFound();
  const admin = await obtenerAdministracion();
  if (!admin) notFound();
  return (
    <>
      <p className="migas">
        <Link href="/configuracion">{t("configuracion.titulo")}</Link> / {t("preferencias.titulo")}
      </p>
      <TituloConIcono icono="configuracion">{t("preferencias.titulo")}</TituloConIcono>
      <FormularioPreferencias diasAviso={admin.diasAvisoRecurrentes} moneda={admin.monedaDefecto} />
    </>
  );
}
