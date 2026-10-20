import Link from "next/link";
import { Icono } from "./Iconos";

export type TonoAccion = "primario" | "secundario" | "peligro";

/**
 * Acción que se muestra solo con un ícono; al pasar el mouse (o con el teclado) aparece su descripción.
 * Con `href` es un enlace (con `externo`, se abre en otra pestaña); sin `href`, un botón.
 */
export function AccionIcono({
  icono,
  titulo,
  href,
  externo = false,
  onClick,
  tono = "secundario",
  disabled = false,
  type = "button",
}: {
  icono: string;
  titulo: string;
  href?: string;
  externo?: boolean;
  onClick?: () => void;
  tono?: TonoAccion;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const clase = `accion-icono accion-icono-${tono}`;
  const contenido = <Icono nombre={icono} tamano={20} />;
  if (href && !disabled) {
    return externo ? (
      <a href={href} target="_blank" rel="noreferrer" className={clase} data-tip={titulo} aria-label={titulo}>
        {contenido}
      </a>
    ) : (
      <Link href={href} className={clase} data-tip={titulo} aria-label={titulo}>
        {contenido}
      </Link>
    );
  }
  return (
    <button type={type} className={clase} data-tip={titulo} aria-label={titulo} onClick={onClick} disabled={disabled || (!onClick && type === "button")}>
      {contenido}
    </button>
  );
}
