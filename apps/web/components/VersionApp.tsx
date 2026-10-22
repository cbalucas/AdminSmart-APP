"use client";

import { useRef } from "react";
import { t } from "@ai/i18n";
import type { VersionApp as Version } from "@ai/domain";
import { Icono } from "./Iconos";

const fechaLarga = (f: string) => new Intl.DateTimeFormat("es-AR", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${f}T12:00:00Z`));

// Número de versión en el menú y, al lado, el reloj que abre el historial con las observaciones de cada una.
export function VersionApp({ versiones }: { versiones: readonly Version[] }) {
  const ventana = useRef<HTMLDialogElement>(null);
  const actual = versiones[0];
  if (!actual) return null;
  return (
    <div className="version-app">
      <span className="version-numero" title={t("version.actual")}>v{actual.version}</span>
      <button type="button" className="version-boton" onClick={() => ventana.current?.showModal()} aria-label={t("version.abrir")} data-tip={t("version.abrir")}>
        <Icono nombre="historial" tamano={18} />
      </button>
      <dialog ref={ventana} className="ventana-detalle ventana-versiones" onClick={(e) => { if (e.target === ventana.current) ventana.current?.close(); }} aria-labelledby="titulo-versiones">
        <header className="detalle-cabecera">
          <span className="acceso-icono" aria-hidden="true"><Icono nombre="historial" tamano={22} /></span>
          <div>
            <h2 id="titulo-versiones">{t("version.titulo")}</h2>
          </div>
          <button type="button" className="boton-accion" onClick={() => ventana.current?.close()} aria-label={t("version.cerrar")} data-tip={t("version.cerrar")}>
            <Icono nombre="cancelar" tamano={18} />
          </button>
        </header>
        <ol className="versiones-lista">
          {versiones.map((v, i) => (
            <li key={v.version} className="version-item">
              <div className="version-cabecera">
                <strong>v{v.version}</strong>
                <span className="muted">{fechaLarga(v.fecha)}</span>
                {i === 0 && <span className="estado estado-ok">{t("version.actual")}</span>}
              </div>
              <p className="version-titulo">{v.titulo}</p>
              <p className="muted">{v.resumen}</p>
              <p className="version-subtitulo">{t("version.relevante")}</p>
              <ul>
                {v.puntos.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </dialog>
    </div>
  );
}
