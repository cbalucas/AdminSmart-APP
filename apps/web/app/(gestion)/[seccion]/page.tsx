import { notFound } from "next/navigation";
import { t } from "@ai/i18n";
import { menuPara } from "@/lib/menu";
import { usuarioActual } from "@/lib/usuario-actual";

// Secciones del menú que todavía no tienen su pantalla. Cada una se reemplaza por su carpeta
// propia cuando se construye. Solo existen las que el rol puede ver.
export default async function Seccion({ params }: { params: Promise<{ seccion: string }> }) {
  const { seccion } = await params;
  const { usuario } = await usuarioActual();
  const item = usuario && menuPara(usuario.roles).find((i) => i.ruta === `/${seccion}` && i.ruta !== "/inicio");
  if (!item) notFound();

  return (
    <>
      <div className="encabezado">
        <h1>{t(`menu.${item.clave}`)}</h1>
      </div>
      <section className="panel">
        <p className="muted">{t("app.seccion_proximamente")}</p>
      </section>
    </>
  );
}
