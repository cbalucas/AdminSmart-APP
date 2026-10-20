import Link from "next/link";
import { notFound } from "next/navigation";
import { t } from "@ai/i18n";
import { FormularioAdministracion } from "@/components/FormularioAdministracion";
import { LogoAdministracion } from "@/components/LogoAdministracion";
import { enlaceDelLogo, obtenerAdministracion } from "@/lib/administracion";
import { usuarioActual } from "@/lib/usuario-actual";

// P-40 Datos de la administración (solo administrador).
export default async function DatosAdministracion() {
  const { usuario } = await usuarioActual();
  if (!usuario?.roles.includes("administrador")) notFound();
  const admin = await obtenerAdministracion();
  if (!admin) notFound();
  const urlLogo = await enlaceDelLogo(admin.logoPath);

  return (
    <>
      <p className="migas">
        <Link href="/configuracion">{t("configuracion.titulo")}</Link> / {t("administracion.titulo")}
      </p>
      <div className="encabezado">
        <h1>{t("administracion.titulo")}</h1>
      </div>

      <section className="grupo logo-seccion">
        <h2>{t("administracion.logo")}</h2>
        <LogoAdministracion organizacionId={usuario.organizacionId} rutaActual={admin.logoPath} url={urlLogo} />
      </section>

      <FormularioAdministracion valores={admin} />
    </>
  );
}
