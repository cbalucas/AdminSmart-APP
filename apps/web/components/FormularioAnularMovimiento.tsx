"use client";

import Link from "next/link";
import { useActionState } from "react";
import { t } from "@ai/i18n";
import type { EstadoAnulacionMovimiento } from "@/app/(gestion)/cuentas-corrientes/acciones";

// Confirmación para anular un movimiento manual (RN-05).
export function FormularioAnularMovimiento({
  accion,
  resumen,
  esTraspaso,
  cancelarHref,
}: {
  accion: (anterior: EstadoAnulacionMovimiento) => Promise<EstadoAnulacionMovimiento>;
  resumen: string;
  esTraspaso: boolean;
  cancelarHref: string;
}) {
  const [estado, enviar, pendiente] = useActionState(accion, {} as EstadoAnulacionMovimiento);
  return (
    <form action={enviar} className="formulario-ancho">
      {estado.error && <p className="aviso-error" role="alert">{t(estado.error)}</p>}
      <section className="grupo">
        <p>{resumen}</p>
        <p className="muted">{esTraspaso ? t("cuentas.ayuda_anular_traspaso") : t("cuentas.ayuda_anular")}</p>
      </section>
      <div className="acciones">
        <Link href={cancelarHref} className="boton boton-secundario">{t("app.cancelar")}</Link>
        <button type="submit" className="boton boton-peligro" disabled={pendiente}>{t("cuentas.anular")}</button>
      </div>
    </form>
  );
}
