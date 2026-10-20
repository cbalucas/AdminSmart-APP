"use client";

import { useActionState, useTransition } from "react";
import { t } from "@ai/i18n";
import { guardarAdministracion } from "@/app/(gestion)/configuracion/administracion/acciones";
import type { Administracion } from "@/lib/administracion";
import type { EstadoFormularioAdministracion } from "@/lib/formulario-administracion";

// P-40 Datos de la administración. Se envía por onSubmit para que React no vacíe los campos si hay un error.
export function FormularioAdministracion({ valores }: { valores: Administracion }) {
  const [estado, enviar, enviando] = useActionState(guardarAdministracion, {} as EstadoFormularioAdministracion);
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
      {estado.guardado && <p className="aviso-ok" role="status">{t("administracion.guardado")}</p>}

      <fieldset className="grupo">
        <legend>{t("administracion.seccion_datos")}</legend>
        <div className="fila fila-2">
          <div className="campo">
            <label htmlFor="nombre">{t("administracion.nombre")}</label>
            <input id="nombre" name="nombre" type="text" defaultValue={valores.nombre} aria-invalid={Boolean(errores.nombre)} />
            {error("nombre")}
          </div>
          <div className="campo">
            <label htmlFor="cuit">{t("administracion.cuit")}</label>
            <input id="cuit" name="cuit" type="text" inputMode="numeric" defaultValue={valores.cuit ?? ""} aria-invalid={Boolean(errores.cuit)} />
            {error("cuit")}
          </div>
        </div>
        <div className="fila fila-2">
          <div className="campo">
            <label htmlFor="contactoTelefono">{t("administracion.telefono")}</label>
            <input id="contactoTelefono" name="contactoTelefono" type="text" inputMode="tel" defaultValue={valores.contactoTelefono ?? ""} />
          </div>
          <div className="campo">
            <label htmlFor="contactoEmail">{t("administracion.email_contacto")}</label>
            <input id="contactoEmail" name="contactoEmail" type="text" inputMode="email" autoCapitalize="none" defaultValue={valores.contactoEmail ?? ""} aria-invalid={Boolean(errores.contactoEmail)} />
            {error("contactoEmail")}
          </div>
        </div>
        <div className="campo">
          <label htmlFor="contactoDireccion">{t("administracion.direccion")}</label>
          <input id="contactoDireccion" name="contactoDireccion" type="text" defaultValue={valores.contactoDireccion ?? ""} />
        </div>
      </fieldset>

      <fieldset className="grupo">
        <legend>{t("administracion.seccion_cuenta")}</legend>
        <p className="muted">{t("administracion.ayuda_cuenta")}</p>
        <div className="fila fila-2">
          <div className="campo">
            <label htmlFor="cuentaDepositoTitular">{t("administracion.titular")}</label>
            <input id="cuentaDepositoTitular" name="cuentaDepositoTitular" type="text" defaultValue={valores.cuentaDepositoTitular ?? ""} aria-invalid={Boolean(errores.cuentaDepositoTitular)} />
            {error("cuentaDepositoTitular")}
          </div>
          <div className="campo">
            <label htmlFor="cuentaDepositoBanco">{t("administracion.banco")}</label>
            <input id="cuentaDepositoBanco" name="cuentaDepositoBanco" type="text" defaultValue={valores.cuentaDepositoBanco ?? ""} />
          </div>
        </div>
        <div className="fila fila-2">
          <div className="campo">
            <label htmlFor="cuentaDepositoAlias">{t("administracion.alias")}</label>
            <input id="cuentaDepositoAlias" name="cuentaDepositoAlias" type="text" autoCapitalize="none" defaultValue={valores.cuentaDepositoAlias ?? ""} aria-invalid={Boolean(errores.cuentaDepositoAlias)} />
            {error("cuentaDepositoAlias")}
          </div>
          <div className="campo">
            <label htmlFor="cuentaDepositoCbu">{t("administracion.cbu")}</label>
            <input id="cuentaDepositoCbu" name="cuentaDepositoCbu" type="text" inputMode="numeric" defaultValue={valores.cuentaDepositoCbu ?? ""} aria-invalid={Boolean(errores.cuentaDepositoCbu)} />
            {error("cuentaDepositoCbu")}
          </div>
        </div>
      </fieldset>

      <fieldset className="grupo">
        <legend>{t("administracion.seccion_envios")}</legend>
        <div className="campo">
          <label htmlFor="emailEnvio">{t("administracion.email_envio")}</label>
          <input id="emailEnvio" name="emailEnvio" type="text" inputMode="email" autoCapitalize="none" defaultValue={valores.emailEnvio ?? ""} aria-invalid={Boolean(errores.emailEnvio)} />
          <span className="muted">{t("administracion.ayuda_email_envio")}</span>
          {error("emailEnvio")}
        </div>
      </fieldset>

      <div className="acciones">
        <button type="submit" className="boton" disabled={enviando}>{t("app.guardar")}</button>
      </div>
    </form>
  );
}
