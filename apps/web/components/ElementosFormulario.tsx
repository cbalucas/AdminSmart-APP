import Link from "next/link";
import type { ReactNode } from "react";
import { t } from "@ai/i18n";
import { Icono } from "./Iconos";

/** Bloque de un formulario: tarjeta con ícono y título (el título también queda para quien usa lector de pantalla). */
export function SeccionFormulario({ icono, titulo, children }: { icono: string; titulo: string; children: ReactNode }) {
  return (
    <fieldset className="grupo">
      <legend className="solo-lectores">{titulo}</legend>
      <div className="grupo-cabecera" aria-hidden="true">
        <span className="grupo-icono"><Icono nombre={icono} tamano={20} /></span>
        <h3>{titulo}</h3>
      </div>
      {children}
    </fieldset>
  );
}

/** Campo de texto, número o lista con un ícono a la izquierda. */
export function CampoIcono({ icono, children }: { icono: string; children: ReactNode }) {
  return (
    <div className="con-icono">
      <Icono nombre={icono} tamano={18} />
      {children}
    </div>
  );
}

/** Botón chico que muestra solo un ícono; el nombre sale al pasar el mouse y lo leen los lectores de pantalla. */
export function BotonIcono({ icono, titulo, onClick, tono = "neutro", disabled }: { icono: string; titulo: string; onClick?: () => void; tono?: "neutro" | "peligro" | "acento"; disabled?: boolean }) {
  return (
    <button type="button" className={`boton-accion boton-accion-${tono}`} onClick={onClick} aria-label={titulo} data-tip={titulo} disabled={disabled}>
      <Icono nombre={icono} tamano={18} />
    </button>
  );
}

/** Cancelar y Guardar, con ícono y palabra. En el celular quedan fijos al pie de la pantalla. */
export function AccionesFormulario({
  cancelarHref,
  pendiente = false,
  guardarTexto,
  iconoGuardar = "guardar",
  peligro = false,
}: {
  cancelarHref?: string;
  pendiente?: boolean;
  guardarTexto?: string;
  iconoGuardar?: string;
  peligro?: boolean;
}) {
  return (
    <div className="acciones acciones-formulario">
      {cancelarHref && (
        <Link href={cancelarHref} className="boton boton-secundario boton-con-icono">
          <Icono nombre="cancelar" tamano={18} />
          {t("app.cancelar")}
        </Link>
      )}
      <button type="submit" className={`boton boton-con-icono${peligro ? " boton-peligro" : ""}`} disabled={pendiente}>
        <Icono nombre={peligro ? "anular" : iconoGuardar} tamano={18} />
        {guardarTexto ?? t("app.guardar")}
      </button>
    </div>
  );
}

/** Título de una pantalla de alta o edición, con un ícono grande. */
export function TituloConIcono({ icono, children }: { icono: string; children: ReactNode }) {
  return (
    <div className="titulo-con-icono">
      <span className="titulo-icono" aria-hidden="true"><Icono nombre={icono} tamano={26} /></span>
      <h1>{children}</h1>
    </div>
  );
}
