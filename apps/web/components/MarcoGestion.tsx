import Image from "next/image";
import Link from "next/link";
import { t } from "@ai/i18n";
import { cerrarSesion } from "@/app/(gestion)/acciones";
import type { ItemMenu } from "@/lib/menu";
import { BotonMenu } from "./BotonMenu";
import { BotonModo } from "./BotonModo";
import { Icono } from "./Iconos";
import { MenuLateral } from "./MenuLateral";

const iniciales = (nombre: string) =>
  nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");

// Marco de las pantallas con sesión: menú lateral fijo y barra superior (mapa de pantallas, navegación web).
export function MarcoGestion({
  items,
  nombre,
  rol,
  children,
}: {
  items: ItemMenu[];
  nombre: string;
  rol: string;
  children: React.ReactNode;
}) {
  return (
    <div className="marco">
      <aside className="lateral">
        <div className="lateral-cabecera">
          <Link href="/inicio" className="marca">
            <Image src="/logo.svg" alt="" width={36} height={36} />
            <strong>{t("app.nombre")}</strong>
          </Link>
          <BotonMenu />
        </div>
        <MenuLateral items={items} />
        <p className="sincronizacion">
          <span className="punto" aria-hidden="true" />
          {t("barra.modo_nube")}
        </p>
      </aside>

      <div className="contenido">
        <header className="barra">
          <label className="buscador">
            <Icono nombre="buscar" />
            <input
              type="search"
              placeholder={t("barra.buscar")}
              disabled
              aria-label={t("barra.buscar")}
              title={t("app.proximamente")}
            />
          </label>
          <BotonModo />
          <button
            type="button"
            className="boton-icono"
            disabled
            aria-label={t("barra.notificaciones")}
            title={t("app.proximamente")}
          >
            <Icono nombre="campana" />
          </button>
          <Link href="/mi-cuenta" className="usuario" title={t("cuenta.titulo")}>
            <span className="avatar" aria-hidden="true">
              {iniciales(nombre)}
            </span>
            <span className="usuario-texto">
              <strong>{nombre}</strong>
              <small>{rol}</small>
            </span>
          </Link>
          <form action={cerrarSesion}>
            <button
              type="submit"
              className="boton-icono"
              aria-label={t("ingreso.cerrar_sesion")}
              title={t("ingreso.cerrar_sesion")}
            >
              <Icono nombre="salir" />
            </button>
          </form>
        </header>
        <main className="pagina">{children}</main>
      </div>
    </div>
  );
}
