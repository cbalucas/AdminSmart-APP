"use client";

import { useActionState, useTransition } from "react";
import { t } from "@ai/i18n";
import { AccionesFormulario, CampoIcono, SeccionFormulario } from "@/components/ElementosFormulario";
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

      <SeccionFormulario icono="edificios" titulo={t("administracion.seccion_datos")}>
        <div className="fila fila-2">
          <div className="campo">
            <label htmlFor="nombre">{t("administracion.nombre")}</label>
            <CampoIcono icono="persona">
              <input id="nombre" name="nombre" type="text" defaultValue={valores.nombre} aria-invalid={Boolean(errores.nombre)} />
            </CampoIcono>
            {error("nombre")}
          </div>
          <div className="campo">
            <label htmlFor="cuit">{t("administracion.cuit")}</label>
            <CampoIcono icono="numero">
              <input id="cuit" name="cuit" type="text" inputMode="numeric" defaultValue={valores.cuit ?? ""} aria-invalid={Boolean(errores.cuit)} />
            </CampoIcono>
            {error("cuit")}
          </div>
        </div>
        <div className="fila fila-2">
          <div className="campo">
            <label htmlFor="contactoTelefono">{t("administracion.telefono")}</label>
            <CampoIcono icono="telefono">
              <input id="contactoTelefono" name="contactoTelefono" type="text" inputMode="tel" defaultValue={valores.contactoTelefono ?? ""} />
            </CampoIcono>
          </div>
          <div className="campo">
            <label htmlFor="contactoEmail">{t("administracion.email_contacto")}</label>
            <CampoIcono icono="mail">
              <input id="contactoEmail" name="contactoEmail" type="text" inputMode="email" autoCapitalize="none" defaultValue={valores.contactoEmail ?? ""} aria-invalid={Boolean(errores.contactoEmail)} />
            </CampoIcono>
            {error("contactoEmail")}
          </div>
        </div>
        <div className="campo">
          <label htmlFor="contactoDireccion">{t("administracion.direccion")}</label>
          <CampoIcono icono="ubicacion">
            <input id="contactoDireccion" name="contactoDireccion" type="text" defaultValue={valores.contactoDireccion ?? ""} />
          </CampoIcono>
        </div>
      </SeccionFormulario>

      <SeccionFormulario icono="cuentas" titulo={t("administracion.seccion_cuenta")}>
        <p className="muted">{t("administracion.ayuda_cuenta")}</p>
        <div className="fila fila-2">
          <div className="campo">
            <label htmlFor="cuentaDepositoTitular">{t("administracion.titular")}</label>
            <CampoIcono icono="persona">
              <input id="cuentaDepositoTitular" name="cuentaDepositoTitular" type="text" defaultValue={valores.cuentaDepositoTitular ?? ""} aria-invalid={Boolean(errores.cuentaDepositoTitular)} />
            </CampoIcono>
            {error("cuentaDepositoTitular")}
          </div>
          <div className="campo">
            <label htmlFor="cuentaDepositoBanco">{t("administracion.banco")}</label>
            <CampoIcono icono="edificios">
              <input id="cuentaDepositoBanco" name="cuentaDepositoBanco" type="text" defaultValue={valores.cuentaDepositoBanco ?? ""} />
            </CampoIcono>
          </div>
        </div>
        <div className="fila fila-2">
          <div className="campo">
            <label htmlFor="cuentaDepositoAlias">{t("administracion.alias")}</label>
            <CampoIcono icono="contratos">
              <input id="cuentaDepositoAlias" name="cuentaDepositoAlias" type="text" autoCapitalize="none" defaultValue={valores.cuentaDepositoAlias ?? ""} aria-invalid={Boolean(errores.cuentaDepositoAlias)} />
            </CampoIcono>
            {error("cuentaDepositoAlias")}
          </div>
          <div className="campo">
            <label htmlFor="cuentaDepositoCbu">{t("administracion.cbu")}</label>
            <CampoIcono icono="numero">
              <input id="cuentaDepositoCbu" name="cuentaDepositoCbu" type="text" inputMode="numeric" defaultValue={valores.cuentaDepositoCbu ?? ""} aria-invalid={Boolean(errores.cuentaDepositoCbu)} />
            </CampoIcono>
            {error("cuentaDepositoCbu")}
          </div>
        </div>
      </SeccionFormulario>

      <SeccionFormulario icono="mail" titulo={t("administracion.seccion_envios")}>
        <div className="campo">
          <label htmlFor="emailEnvio">{t("administracion.email_envio")}</label>
          <CampoIcono icono="mail">
            <input id="emailEnvio" name="emailEnvio" type="text" inputMode="email" autoCapitalize="none" defaultValue={valores.emailEnvio ?? ""} aria-invalid={Boolean(errores.emailEnvio)} />
          </CampoIcono>
          <span className="muted">{t("administracion.ayuda_email_envio")}</span>
          {error("emailEnvio")}
        </div>
      </SeccionFormulario>

      <AccionesFormulario pendiente={enviando} />
    </form>
  );
}
