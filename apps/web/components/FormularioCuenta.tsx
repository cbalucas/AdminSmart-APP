"use client";

import Link from "next/link";
import { useActionState } from "react";
import { t } from "@ai/i18n";
import { TIPOS_CUENTA } from "@ai/domain";
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
            <label htmlFor="banco">{t("cuentas.campo_banco")}</label>
            <input id="banco" name="banco" type="text" defaultValue={valores.banco} aria-invalid={Boolean(errores.banco)} />
            {error("banco")}
          </div>
          <div className="campo">
            <label htmlFor="tipoCuenta">{t("cuentas.campo_tipo")}</label>
            <select id="tipoCuenta" name="tipoCuenta" defaultValue={valores.tipoCuenta}>
              {TIPOS_CUENTA.map((tipo) => (
                <option key={tipo} value={tipo}>{t(`cuentas.tipo_${tipo}`)}</option>
              ))}
            </select>
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
          <div className="campo ancho">
            <label htmlFor="cbuCvu">{t("cuentas.campo_cbu")}</label>
            <input id="cbuCvu" name="cbuCvu" type="text" inputMode="numeric" defaultValue={valores.cbuCvu} aria-invalid={Boolean(errores.cbuCvu)} />
            {error("cbuCvu")}
          </div>
          <div className="campo">
            <label htmlFor="alias">{t("cuentas.campo_alias")}</label>
            <input id="alias" name="alias" type="text" defaultValue={valores.alias} />
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
