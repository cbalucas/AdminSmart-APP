import Link from "next/link";
import { notFound } from "next/navigation";
import { t } from "@ai/i18n";
import { Icono } from "@/components/Iconos";
import { usuarioActual } from "@/lib/usuario-actual";

const ACCESOS = [
  { clave: "administracion", ruta: "/configuracion/administracion", icono: "edificios" },
  { clave: "preferencias", ruta: "/configuracion/preferencias", icono: "configuracion" },
  { clave: "plantillas", ruta: "/configuracion/plantillas", icono: "mail" },
  { clave: "conceptos", ruta: "/configuracion/conceptos", icono: "obligaciones" },
] as const;

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
        {ACCESOS.map((a) => (
          <Link key={a.clave} href={a.ruta} className="acceso">
            <span className="acceso-icono" aria-hidden="true"><Icono nombre={a.icono} tamano={24} /></span>
            <strong>{t(`configuracion.${a.clave}`)}</strong>
            <span className="muted">{t(`configuracion.${a.clave}_desc`)}</span>
          </Link>
        ))}
      </section>
    </>
  );
}
