import Link from "next/link";
import { t } from "@ai/i18n";
import { Icono } from "./Iconos";

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
}: {
  id: string;
  icono: string;
  tono?: TonoIndicador;
  titulo: string;
  valor: string;
  nota?: string;
  observacion?: string;
  href?: string;
}) {
  return (
    <article className={`indicador tono-${tono}${href ? " indicador-enlace" : ""}`}>
      {href && (
        <Link href={href} className="indicador-vinculo">
          <span className="solo-lectores">{titulo}</span>
        </Link>
      )}
      <p className="muted indicador-titulo">{titulo}</p>
      <span className="indicador-icono" aria-hidden="true"><Icono nombre={icono} tamano={22} /></span>
      <strong className="cifra">{valor}</strong>
      {observacion && (
        <span className="indicador-info">
          <button type="button" className="info-boton" aria-label={t("inicio.ver_observacion")} aria-describedby={`obs-${id}`}>
            <Icono nombre="info" tamano={18} />
          </button>
          <span role="tooltip" id={`obs-${id}`} className="info-globo">{observacion}</span>
        </span>
      )}
      {nota && <p className="muted indicador-nota">{nota}</p>}
    </article>
  );
}
