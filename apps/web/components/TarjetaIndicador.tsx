import Link from "next/link";
import { t } from "@ai/i18n";
import { Icono } from "./Iconos";

// Cuanto más largo el importe, más chica la letra, para que ni millones desarmen la tarjeta.
const tamanoCifra = (valor: string) => {
  const largo = valor.length;
  return largo <= 7 ? "1.7rem" : largo <= 9 ? "1.45rem" : largo <= 11 ? "1.25rem" : largo <= 13 ? "1.05rem" : "0.9rem";
};

export type TonoIndicador = "peligro" | "aviso" | "acento" | "ok" | "neutro";

/**
 * Tarjeta de un indicador: título, ícono, cifra y una nota. Una observación larga va en un globo
 * (ícono de información). Con `href`, toda la tarjeta lleva a otra pantalla.
 */
export function TarjetaIndicador({
  id,
  icono,
  tono = "neutro",
  titulo,
  valor,
  nota,
  observacion,
  href,
  accion,
  destacada = false,
}: {
  id: string;
  icono: string;
  tono?: TonoIndicador;
  titulo: string;
  valor: string;
  nota?: string;
  observacion?: string;
  href?: string;
  /** Enlace de acción dentro de la tarjeta (en lugar de la nota). */
  accion?: { href: string; texto: string };
  /** Fondo de aviso (ámbar), para lo que requiere atención. */
  destacada?: boolean;
}) {
  return (
    <article className={`indicador tono-${tono}${href ? " indicador-enlace" : ""}${destacada ? " indicador-destacado" : ""}`}>
      {href && (
        <Link href={href} className="indicador-vinculo">
          <span className="solo-lectores">{titulo}</span>
        </Link>
      )}
      <p className="muted indicador-titulo">{titulo}</p>
      <span className="indicador-icono" aria-hidden="true"><Icono nombre={icono} tamano={22} /></span>
      <strong className="cifra" style={{ fontSize: tamanoCifra(valor) }} title={valor}>{valor}</strong>
      {observacion && (
        <span className="indicador-info">
          <button type="button" className="info-boton" aria-label={t("inicio.ver_observacion")} aria-describedby={`obs-${id}`}>
            <Icono nombre="info" tamano={18} />
          </button>
          <span role="tooltip" id={`obs-${id}`} className="info-globo">{observacion}</span>
        </span>
      )}
      {nota && <p className="muted indicador-nota">{nota}</p>}
      {accion && (
        <p className="indicador-nota">
          <Link href={accion.href} className="indicador-accion">{accion.texto}</Link>
        </p>
      )}
    </article>
  );
}
