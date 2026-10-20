import Link from "next/link";
import { notFound } from "next/navigation";
import { t } from "@ai/i18n";
import { TituloConIcono } from "@/components/ElementosFormulario";
import { FormularioAuditoriaConfig } from "@/components/FormularioAuditoriaConfig";
import { obtenerConfigAuditoria } from "@/lib/auditoria-config";
import { usuarioActual } from "@/lib/usuario-actual";

// AUD-04 Configuración de la auditoría (solo administrador).
export default async function ConfiguracionAuditoria() {
  const { usuario } = await usuarioActual();
  if (!usuario?.roles.includes("administrador")) notFound();
  const config = await obtenerConfigAuditoria();
  return (
    <>
      <p className="migas">
        <Link href="/configuracion">{t("configuracion.titulo")}</Link> / {t("configuracion.auditoria")}
      </p>
      <TituloConIcono icono="auditoria">{t("auditoria_config.titulo")}</TituloConIcono>
      <FormularioAuditoriaConfig activa={config.activa} propietarios={config.propietarios} />
    </>
  );
}
