import Link from "next/link";
import { notFound } from "next/navigation";
import { t } from "@ai/i18n";
import { usuarioActual } from "@/lib/usuario-actual";

// P-39 Configuración: accesos a las pantallas de ajustes. Se suman a medida que se construyen.
export default async function Configuracion() {
  const { usuario } = await usuarioActual();
  if (!usuario?.roles.includes("administrador")) notFound();

  return (
    <>
      <div className="encabezado">
        <h1>{t("configuracion.titulo")}</h1>
      </div>
      <section className="accesos">
        <Link href="/configuracion/conceptos" className="acceso">
          <strong>{t("configuracion.conceptos")}</strong>
          <span className="muted">{t("configuracion.conceptos_desc")}</span>
        </Link>
      </section>
    </>
  );
}
