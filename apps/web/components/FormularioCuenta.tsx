"use client";

import { useActionState, useState } from "react";
import { t } from "@ai/i18n";
import { AccionesFormulario, CampoIcono, SeccionFormulario } from "@/components/ElementosFormulario";
import type { EstadoCuenta } from "@/app/(gestion)/propietarios/[id]/cuentas/acciones";

export interface ValoresCuenta {
  banco: string;
  tipoCuenta: string;
  moneda: string;
  cbuCvu: string;
  alias: string;
  titular: string;
}

export const CUENTA_NUEVA: ValoresCuenta = {
  banco: "",
  tipoCuenta: "caja_ahorro",
  moneda: "ARS",
  cbuCvu: "",
  alias: "",
  titular: "",
};

type Accion = (anterior: EstadoCuenta, formulario: FormData) => Promise<EstadoCuenta>;

// P-14 Cuenta bancaria: alta y edición. En la edición la moneda no se cambia.
// "Banco o billetera" es un combo; si es un banco se elige además caja de ahorro o cuenta corriente.
export function FormularioCuenta({
  accion,
  valores,
  cancelarHref,
  editando = false,
}: {
  accion: Accion;
  valores: ValoresCuenta;
  cancelarHref: string;
  editando?: boolean;
}) {
  const [estado, enviar, pendiente] = useActionState(accion, {} as EstadoCuenta);
  const [esBilletera, setEsBilletera] = useState(valores.tipoCuenta === "billetera");
  const errores = estado.errores ?? {};
  const error = (campo: string) =>
    errores[campo] ? (
      <span className="error-campo" role="alert">
        {t(errores[campo])}
      </span>
    ) : null;

  return (
    <form action={enviar} className="formulario-ancho formulario-compacto" noValidate>
      {estado.error && <p className="aviso-error" role="alert">{t(estado.error)}</p>}

      <SeccionFormulario icono="persona" titulo={t("cuentas.seccion_titular")}>
        <div className="campo">
          <label htmlFor="titular">{t("cuentas.campo_titular")}</label>
          <CampoIcono icono="persona">
            <input id="titular" name="titular" type="text" defaultValue={valores.titular} aria-invalid={Boolean(errores.titular)} />
          </CampoIcono>
          {error("titular")}
        </div>
      </SeccionFormulario>

      <SeccionFormulario icono="cuentas" titulo={t("cuentas.seccion_cuenta")}>
        <div className={esBilletera ? "fila fila-2" : "fila fila-3"}>
          <div className="campo">
            <label htmlFor="entidad">{t("cuentas.campo_entidad")}</label>
            <CampoIcono icono="edificios">
              <select id="entidad" value={esBilletera ? "billetera" : "banco"} onChange={(e) => setEsBilletera(e.target.value === "billetera")}>
                <option value="banco">{t("cuentas.entidad_banco")}</option>
                <option value="billetera">{t("cuentas.entidad_billetera")}</option>
              </select>
            </CampoIcono>
          </div>
          {esBilletera ? (
            <input type="hidden" name="tipoCuenta" value="billetera" />
          ) : (
            <div className="campo">
              <label htmlFor="tipoCuenta">{t("cuentas.campo_tipo")}</label>
              <CampoIcono icono="contratos">
                <select id="tipoCuenta" name="tipoCuenta" defaultValue={valores.tipoCuenta === "cuenta_corriente" ? "cuenta_corriente" : "caja_ahorro"}>
                  <option value="caja_ahorro">{t("cuentas.tipo_caja_ahorro")}</option>
                  <option value="cuenta_corriente">{t("cuentas.tipo_cuenta_corriente")}</option>
                </select>
              </CampoIcono>
            </div>
          )}
          <div className="campo">
            <label htmlFor="moneda">{t("cuentas.campo_moneda")}</label>
            <CampoIcono icono="dinero">
              {editando ? (
                <>
                  <input type="hidden" name="moneda" value={valores.moneda} />
                  <input id="moneda" type="text" value={t(`cuentas.moneda_${valores.moneda}`)} readOnly />
                </>
              ) : (
                <select id="moneda" name="moneda" defaultValue={valores.moneda}>
                  <option value="ARS">{t("cuentas.moneda_ARS")}</option>
                  <option value="USD">{t("cuentas.moneda_USD")}</option>
                </select>
              )}
            </CampoIcono>
          </div>
        </div>
        <div className="campo">
          <label htmlFor="banco">{t("cuentas.campo_banco")}</label>
          <CampoIcono icono="edificios">
            <input id="banco" name="banco" type="text" defaultValue={valores.banco} />
          </CampoIcono>
        </div>
      </SeccionFormulario>

      <SeccionFormulario icono="numero" titulo={t("cuentas.seccion_identificacion")}>
        <p className="muted">{t("cuentas.ayuda_identificacion")}</p>
        <div className="fila fila-2">
          <div className="campo">
            <label htmlFor="alias">{t("cuentas.campo_alias")}</label>
            <CampoIcono icono="contratos">
              <input id="alias" name="alias" type="text" autoCapitalize="none" defaultValue={valores.alias} aria-invalid={Boolean(errores.alias)} />
            </CampoIcono>
            {error("alias")}
          </div>
          <div className="campo">
            <label htmlFor="cbuCvu">{t("cuentas.campo_cbu")}</label>
            <CampoIcono icono="numero">
              <input id="cbuCvu" name="cbuCvu" type="text" inputMode="numeric" defaultValue={valores.cbuCvu} aria-invalid={Boolean(errores.cbuCvu)} />
            </CampoIcono>
            {error("cbuCvu")}
          </div>
        </div>
      </SeccionFormulario>

      <AccionesFormulario cancelarHref={cancelarHref} pendiente={pendiente} />
    </form>
  );
}
