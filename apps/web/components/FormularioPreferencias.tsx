"use client";

import { useActionState, useTransition } from "react";
import { t } from "@ai/i18n";
import { AccionesFormulario, CampoIcono, SeccionFormulario } from "@/components/ElementosFormulario";
import { MAX_DIAS_AVISO_RECURRENTES } from "@ai/domain";
import { guardarPreferencias, type EstadoPreferencias } from "@/app/(gestion)/configuracion/preferencias/acciones";

// P-43 Preferencias generales. Lo que depende del ingreso de usuarios (doble factor, registro abierto) y el idioma
// (oculto hasta la traducción) se muestran como no disponibles.
export function FormularioPreferencias({ diasAviso, moneda }: { diasAviso: number; moneda: "ARS" | "USD" }) {
  const [estado, enviar, enviando] = useActionState(guardarPreferencias, {} as EstadoPreferencias);
  const [, iniciar] = useTransition();
  const errores = estado.errores ?? {};
  const error = (campo: string) =>
    errores[campo] ? (
      <span className="error-campo" role="alert">
        {t(errores[campo])}
      </span>
    ) : null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const datos = new FormData(e.currentTarget);
        iniciar(() => enviar(datos));
      }}
      className="formulario-ancho"
      noValidate
    >
      {estado.error && <p className="aviso-error" role="alert">{t(estado.error)}</p>}
      {estado.guardado && <p className="aviso-ok" role="status">{t("preferencias.guardado")}</p>}

      <SeccionFormulario icono="recurrente" titulo={t("preferencias.seccion_gastos")}>
        <div className="campo">
          <label htmlFor="diasAvisoRecurrentes">{t("preferencias.dias_aviso")}</label>
          <CampoIcono icono="calendario">
            <input
              id="diasAvisoRecurrentes"
              name="diasAvisoRecurrentes"
              type="number"
              min={1}
              max={MAX_DIAS_AVISO_RECURRENTES}
              defaultValue={diasAviso}
              aria-invalid={Boolean(errores.diasAvisoRecurrentes)}
            />
          </CampoIcono>
          <span className="muted">{t("preferencias.ayuda_dias_aviso", { maximo: MAX_DIAS_AVISO_RECURRENTES })}</span>
          {error("diasAvisoRecurrentes")}
        </div>
      </SeccionFormulario>

      <SeccionFormulario icono="dinero" titulo={t("preferencias.seccion_monedas")}>
        <div className="campo">
          <label htmlFor="monedaDefecto">{t("preferencias.moneda")}</label>
          <CampoIcono icono="dinero">
            <select id="monedaDefecto" name="monedaDefecto" defaultValue={moneda}>
              <option value="ARS">{t("cuentas.pesos")}</option>
              <option value="USD">{t("cuentas.dolares")}</option>
            </select>
          </CampoIcono>
          <span className="muted">{t("preferencias.ayuda_moneda")}</span>
          {error("monedaDefecto")}
        </div>
      </SeccionFormulario>

      <SeccionFormulario icono="auditoria" titulo={t("preferencias.seccion_acceso")}>
        <p className="muted">{t("preferencias.acceso_proximamente")}</p>
        <div className="campo">
          <label htmlFor="doble-factor">{t("preferencias.doble_factor")}</label>
          <CampoIcono icono="auditoria">
            <select id="doble-factor" disabled defaultValue="desactivado">
              <option value="desactivado">{t("preferencias.doble_factor_desactivado")}</option>
            </select>
          </CampoIcono>
        </div>
        <label className="casilla">
          <input type="checkbox" disabled />
          {t("preferencias.registro_abierto")}
        </label>
      </SeccionFormulario>

      <AccionesFormulario pendiente={enviando} />
    </form>
  );
}
