import Link from "next/link";
import { t } from "@ai/i18n";
import { Icono } from "./Iconos";

/** "Volver a <propietario>": regresa a la ficha desde la que se llegó a un bien o a una cuenta corriente. */
export function BotonVolver({ href, nombre }: { href: string; nombre: string }) {
  return (
    <Link href={href} className="boton-volver">
      <Icono nombre="volver" tamano={18} />
      {t("app.volver_a", { nombre })}
    </Link>
  );
}
