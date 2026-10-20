"use client";

import Link from "next/link";
import { useRef } from "react";
import { t } from "@ai/i18n";
import { IconoBien } from "./IconoBien";
import { Icono } from "./Iconos";

export interface DatosDetalleObligacion {
  id: string;
  concepto: string;
  bien: string;
  tipoBien: string;
  tipoBienTexto: string;
  propietarios: string;
  quien: string;
  recurrencia: string;
  periodo: string;
  vencimiento: string;
  monto: string | null;
  responsable: string;
  estadoTexto: string;
  estadoClase: string;
  pago: string;
  boletas: { titulo: string; url: string }[];
  acciones: { href: string; icono: string; texto: string; peligro?: boolean }[];
}

// Todo lo de una obligación que la tabla no muestra, en una ventana con las acciones posibles.
export function DetalleObligacion({ d }: { d: DatosDetalleObligacion }) {
  const ventana = useRef<HTMLDialogElement>(null);
  const fila = (titulo: string, valor: string | null | undefined) =>
    valor ? (
      <>
        <dt>{titulo}</dt>
        <dd>{valor}</dd>
      </>
    ) : null;
  return (
    <>
      <button type="button" className="accion-icono accion-icono-secundario" data-tip={t("obligaciones.ver_detalle")} aria-label={t("obligaciones.ver_detalle")} onClick={() => ventana.current?.showModal()}>
        <Icono nombre="ojo" tamano={20} />
      </button>
      <dialog ref={ventana} className="ventana-detalle" onClick={(e) => { if (e.target === ventana.current) ventana.current?.close(); }} aria-labelledby={`obl-${d.id}`}>
        <header className="detalle-cabecera">
          <IconoBien tipo={d.tipoBien} />
          <div>
            <h2 id={`obl-${d.id}`}>{d.concepto}</h2>
            <p className="muted">{d.bien}</p>
          </div>
          <button type="button" className="boton-accion" onClick={() => ventana.current?.close()} aria-label={t("obligaciones.detalle_cerrar")} data-tip={t("obligaciones.detalle_cerrar")}>
            <Icono nombre="cancelar" tamano={18} />
          </button>
        </header>
        <p><span className={d.estadoClase}>{d.estadoTexto}</span></p>
        <dl className="datos">
          {fila(t("obligaciones.col_bien"), `${d.tipoBienTexto}${d.propietarios ? ` · ${d.propietarios}` : ""}`)}
          {fila(t("obligaciones.col_empresa"), d.quien)}
          {fila(t("obligaciones.col_periodo"), d.periodo)}
          {fila(t("obligaciones.col_vencimiento"), d.vencimiento)}
          {fila(t("obligaciones.col_monto"), d.monto ?? t("obligaciones.falta_monto"))}
          {fila(t("obligaciones.col_responsable"), d.responsable)}
          {fila(t("obligaciones.detalle_recurrencia"), d.recurrencia)}
          {fila(t("obligaciones.col_fecha_pago"), d.pago)}
        </dl>
        {d.boletas.length > 0 && (
          <p className="detalle-boletas">
            <strong>{t("obligaciones.detalle_boletas")}: </strong>
            {d.boletas.map((b) => (
              <a key={b.url} href={b.url} target="_blank" rel="noreferrer">{b.titulo}</a>
            ))}
          </p>
        )}
        {d.acciones.length > 0 && (
          <footer className="detalle-pie">
            {d.acciones.map((a) => (
              <Link key={a.href} href={a.href} className={`boton boton-con-icono${a.peligro ? " boton-peligro" : " boton-secundario"}`}>
                <Icono nombre={a.icono} tamano={18} />
                {a.texto}
              </Link>
            ))}
          </footer>
        )}
      </dialog>
    </>
  );
}
