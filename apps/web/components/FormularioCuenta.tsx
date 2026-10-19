"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { t } from "@ai/i18n";
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
    <form action={enviar} className="formulario-ancho" noValidate>
      {estado.error && <p className="aviso-error" role="alert">{t(estado.error)}</p>}
      <fieldset className="grupo">
        <legend>{t("cuentas.titulo")}</legend>
        <div className="rejilla">
          <div className="campo">
            <label htmlFor="entidad">{t("cuentas.campo_entidad")}</label>
            <select id="entidad" value={esBilletera ? "billetera" : "banco"} onChange={(e) => setEsBilletera(e.target.value === "billetera")}>
              <option value="banco">{t("cuentas.entidad_banco")}</option>
              <option value="billetera">{t("cuentas.entidad_billetera")}</option>
            </select>
          </div>
          {esBilletera ? (
            <input type="hidden" name="tipoCuenta" value="billetera" />
          ) : (
            <div className="campo">
              <label htmlFor="tipoCuenta">{t("cuentas.campo_tipo")}</label>
              <select id="tipoCuenta" name="tipoCuenta" defaultValue={valores.tipoCuenta === "cuenta_corriente" ? "cuenta_corriente" : "caja_ahorro"}>
                <option value="caja_ahorro">{t("cuentas.tipo_caja_ahorro")}</option>
                <option value="cuenta_corriente">{t("cuentas.tipo_cuenta_corriente")}</option>
              </select>
            </div>
          )}
          <div className="campo">
            <label htmlFor="banco">{t("cuentas.campo_banco")}</label>
            <input id="banco" name="banco" type="text" defaultValue={valores.banco} />
          </div>
          <div className="campo">
            <label htmlFor="moneda">{t("cuentas.campo_moneda")}</label>
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
          </div>
          <p className="muted ancho">{t("cuentas.ayuda_identificacion")}</p>
          <div className="campo ancho">
            <label htmlFor="alias">{t("cuentas.campo_alias")}</label>
            <input id="alias" name="alias" type="text" autoCapitalize="none" defaultValue={valores.alias} aria-invalid={Boolean(errores.alias)} />
            {error("alias")}
          </div>
          <div className="campo ancho">
            <label htmlFor="cbuCvu">{t("cuentas.campo_cbu")}</label>
            <input id="cbuCvu" name="cbuCvu" type="text" inputMode="numeric" defaultValue={valores.cbuCvu} aria-invalid={Boolean(errores.cbuCvu)} />
            {error("cbuCvu")}
          </div>
          <div className="campo ancho">
            <label htmlFor="titular">{t("cuentas.campo_titular")}</label>
            <input id="titular" name="titular" type="text" defaultValue={valores.titular} aria-invalid={Boolean(errores.titular)} />
            {error("titular")}
          </div>
        </div>
      </fieldset>
      <div className="acciones">
        <Link href={cancelarHref} className="boton boton-secundario">{t("app.cancelar")}</Link>
        <button type="submit" className="boton" disabled={pendiente}>{t("app.guardar")}</button>
      </div>
    </form>
  );
}
