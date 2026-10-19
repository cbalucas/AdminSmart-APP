import Image from "next/image";
import { t } from "@ai/i18n";
import { MarcoGestion } from "@/components/MarcoGestion";
import { menuPara } from "@/lib/menu";
import { usuarioActual } from "@/lib/usuario-actual";
import { cerrarSesion } from "./acciones";

// Todas las pantallas con sesión comparten este marco. Una cuenta sin usuario activo no entra.
export default async function LayoutGestion({ children }: { children: React.ReactNode }) {
  const { email, usuario } = await usuarioActual();

  if (!usuario || usuario.estado !== "activo") {
    return (
      <main className="pantalla-acceso">
        <section className="formulario">
          <Image src="/logo.svg" alt="" width={56} height={56} />
          <h2>{t("ingreso.sin_acceso_titulo")}</h2>
          <p className="muted">{t("ingreso.sin_acceso_texto")}</p>
          <p className="muted">{email}</p>
          <form action={cerrarSesion}>
            <button type="submit" className="boton boton-secundario">
              {t("ingreso.cerrar_sesion")}
            </button>
          </form>
        </section>
      </main>
    );
  }

  const roles = usuario.roles.map((r) => t(`rol.${r}`)).join(", ");
  return (
    <MarcoGestion items={menuPara(usuario.roles)} nombre={usuario.nombre} rol={roles}>
      {children}
    </MarcoGestion>
  );
}
