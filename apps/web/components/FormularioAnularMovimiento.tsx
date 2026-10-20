"use client";

import { useActionState } from "react";
import { t } from "@ai/i18n";
import { AccionesFormulario, SeccionFormulario } from "@/components/ElementosFormulario";
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
      <SeccionFormulario icono="anular" titulo={t("cuentas.titulo_anular")}>
        <p>{resumen}</p>
        <p className="muted">{esTraspaso ? t("cuentas.ayuda_anular_traspaso") : t("cuentas.ayuda_anular")}</p>
      </SeccionFormulario>
      <AccionesFormulario cancelarHref={cancelarHref} pendiente={pendiente} guardarTexto={t("cuentas.anular")} peligro />
    </form>
  );
}
