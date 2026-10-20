"use client";

import Link from "next/link";
import { useRef } from "react";
import { t } from "@ai/i18n";
import { IconoBien } from "./IconoBien";
import { Icono } from "./Iconos";

export interface FilaDetalle {
  concepto: string;
  fecha: string;
  monto: string;
}

export interface DatosTarjetaBien {
  id: string;
  href: string;
  nombre: string;
  tipoBien: string;
  tipoTexto: string;
  estadoTexto: string;
  porcentajeTexto: string;
  situacion: "con_deuda" | "a_completar" | "al_dia" | "sin_obligaciones";
  linea: string;
  vencidas: FilaDetalle[];
  proximas: FilaDetalle[];
  aCompletar: FilaDetalle[];
  pagadas: number;
}

const CLASE_SITUACION: Record<DatosTarjetaBien["situacion"], string> = {
  con_deuda: "estado estado-vencida",
  a_completar: "estado estado-ambar",
  al_dia: "estado estado-ok",
  sin_obligaciones: "estado estado-neutro",
};
const LIMITE = 6;

function Lista({ titulo, filas, tono }: { titulo: string; filas: FilaDetalle[]; tono: string }) {
  if (filas.length === 0) return null;
  return (
    <section className={`detalle-bloque detalle-${tono}`}>
      <h3>{titulo} <span className="contador">{filas.length}</span></h3>
      <ul>
        {filas.slice(0, LIMITE).map((f, k) => (
          <li key={k}>
            <span><strong>{f.concepto}</strong>{f.fecha && <span className="muted"> · {f.fecha}</span>}</span>
            <strong>{f.monto}</strong>
          </li>
        ))}
        {filas.length > LIMITE && <li className="muted">{t("bien_card.mas", { cantidad: String(filas.length - LIMITE) })}</li>}
      </ul>
    </section>
  );
}

// Bien en la ficha del propietario: situación a simple vista; al tocarla se abre el detalle con el enlace al bien.
export function TarjetaBien({ d }: { d: DatosTarjetaBien }) {
  const ventana = useRef<HTMLDialogElement>(null);
  const hayPendientes = d.vencidas.length + d.proximas.length + d.aCompletar.length > 0;
  return (
    <li className="tarjeta-propietario tarjeta-bien">
      <button type="button" className="tarjeta-propietario-vinculo" aria-label={`${t("bien_card.ver_detalle")}: ${d.nombre}`} onClick={() => ventana.current?.showModal()} />
      <IconoBien tipo={d.tipoBien} />
      <Link href={d.href} className="tarjeta-bien-nombre">{d.nombre}</Link>
      <span className="muted">{d.tipoTexto}</span>
      <span className={CLASE_SITUACION[d.situacion]}>{t(`bien_card.${d.situacion}`)}</span>
      {d.linea && <span className="tarjeta-bien-linea">{d.linea}</span>}
      <dl className="tarjeta-propietario-datos">
        <div><dt>{t("propietarios.col_estado")}</dt><dd>{d.estadoTexto}</dd></div>
        <div><dt>{t("propietarios.col_porcentaje")}</dt><dd>{d.porcentajeTexto}</dd></div>
      </dl>

      <dialog ref={ventana} className="ventana-detalle" onClick={(e) => { if (e.target === ventana.current) ventana.current?.close(); }} aria-labelledby={`det-${d.id}`}>
        <header className="detalle-cabecera">
          <IconoBien tipo={d.tipoBien} />
          <div>
            <h2 id={`det-${d.id}`}>{d.nombre}</h2>
            <p className="muted">{d.tipoTexto} · {d.estadoTexto} · {d.porcentajeTexto}</p>
          </div>
          <button type="button" className="boton-accion" onClick={() => ventana.current?.close()} aria-label={t("bien_card.cerrar")} title={t("bien_card.cerrar")}>
            <Icono nombre="cancelar" tamano={18} />
          </button>
        </header>
        <p><span className={CLASE_SITUACION[d.situacion]}>{t(`bien_card.${d.situacion}`)}</span></p>
        <Lista titulo={t("bien_card.vencidas")} filas={d.vencidas} tono="peligro" />
        <Lista titulo={t("bien_card.proximas")} filas={d.proximas} tono="neutro" />
        <Lista titulo={t("bien_card.por_completar")} filas={d.aCompletar} tono="aviso" />
        {!hayPendientes && <p className="muted">{t("bien_card.sin_pendientes")}</p>}
        {d.pagadas > 0 && <p className="muted">{t("bien_card.pagadas", { cantidad: String(d.pagadas) })}</p>}
        <footer className="detalle-pie">
          <Link href={d.href} className="boton boton-con-icono">
            <Icono nombre="bienes" tamano={18} />
            {t("bien_card.ver_bien")}
          </Link>
        </footer>
      </dialog>
    </li>
  );
}
