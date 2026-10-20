"use client";

import { useActionState } from "react";
import { t } from "@ai/i18n";
import { AccionesFormulario, SeccionFormulario } from "@/components/ElementosFormulario";
import type { EstadoAnulacion } from "@/app/(gestion)/obligaciones/pagos";

// P-28 Anular un pago: el motivo es obligatorio (PAG-05).
export function FormularioAnulacion({
  accion,
  resumen,
}: {
  accion: (anterior: EstadoAnulacion, formulario: FormData) => Promise<EstadoAnulacion>;
  resumen: string;
}) {
  const [estado, enviar, pendiente] = useActionState(accion, {} as EstadoAnulacion);
  return (
    <form action={enviar} className="formulario-ancho" noValidate>
      {estado.error && <p className="aviso-error" role="alert">{t(estado.error)}</p>}
      <SeccionFormulario icono="anular" titulo={t("pagos.titulo_anular")}>
        <p>{resumen}</p>
        <p className="muted">{t("pagos.ayuda_anular")}</p>
        <div className="campo">
          <label htmlFor="motivo">{t("pagos.campo_motivo_anulacion")}</label>
          <textarea id="motivo" name="motivo" rows={3} />
        </div>
      </SeccionFormulario>
      <AccionesFormulario cancelarHref="/obligaciones" pendiente={pendiente} guardarTexto={t("pagos.anular")} peligro />
    </form>
  );
}
