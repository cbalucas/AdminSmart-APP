"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { t } from "@ai/i18n";
import { PERIODICIDADES, TIPOS_TELEFONO } from "@ai/domain";
import type { EstadoFormulario } from "@/lib/formulario-propietario";

export interface ValoresPropietario {
  tipoPersona: string;
  nombre: string;
  telefonos: { tipo: string; numero: string }[];
  emails: { email: string; principal: boolean }[];
  apoderadoNombre: string;
  apoderadoContacto: string;
  periodicidadLiquidacion: string;
  diaLiquidacion: string;
  horizonteResumenDias: string;
  fondoReservaArs: string;
  fondoReservaUsd: string;
  observaciones: string;
}

export const VALORES_NUEVO: ValoresPropietario = {
  tipoPersona: "humana",
  nombre: "",
  telefonos: [{ tipo: "celular", numero: "" }],
  emails: [{ email: "", principal: true }],
  apoderadoNombre: "",
  apoderadoContacto: "",
  periodicidadLiquidacion: "mensual",
  diaLiquidacion: "",
  horizonteResumenDias: "30",
  fondoReservaArs: "",
  fondoReservaUsd: "",
  observaciones: "",
};

type Accion = (anterior: EstadoFormulario, formulario: FormData) => Promise<EstadoFormulario>;

// P-13 Alta y edición de propietario.
export function FormularioPropietario({
  accion,
  valores,
  cancelarHref,
}: {
  accion: Accion;
  valores: ValoresPropietario;
  cancelarHref: string;
}) {
  const [estado, enviar, pendiente] = useActionState(accion, {} as EstadoFormulario);
  // Cada fila lleva un identificador propio para que quitar una no mezcle los valores de las demás.
  const contador = useRef(1000);
  const nuevaClave = () => contador.current++;
  const [telefonos, setTelefonos] = useState(() => valores.telefonos.map((v, k) => ({ ...v, k })));
  const [emails, setEmails] = useState(() => valores.emails.map((v, k) => ({ ...v, k })));
  const [principal, setPrincipal] = useState(Math.max(0, valores.emails.findIndex((e) => e.principal)));
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
      {estado.duplicado && (
        <div className="aviso-advertencia" role="alert">
          <p>{t("propietarios.duplicado")}</p>
          <button type="submit" name="confirmarDuplicado" value="1" className="boton boton-secundario" disabled={pendiente}>
            {t("propietarios.guardar_igual")}
          </button>
        </div>
      )}

      <fieldset className="grupo">
        <legend>{t("propietarios.seccion_datos")}</legend>
        <div className="fila fila-tipo-nombre">
          <div className="campo">
            <label htmlFor="tipoPersona">{t("propietarios.campo_tipo")}</label>
            <select id="tipoPersona" name="tipoPersona" defaultValue={valores.tipoPersona}>
              <option value="humana">{t("propietarios.tipo_humana")}</option>
              <option value="juridica">{t("propietarios.tipo_juridica")}</option>
            </select>
          </div>
          <div className="campo">
            <label htmlFor="nombre">{t("propietarios.campo_nombre")}</label>
            <input id="nombre" name="nombre" type="text" defaultValue={valores.nombre} aria-invalid={Boolean(errores.nombre)} required />
            {error("nombre")}
          </div>
        </div>
      </fieldset>

      <fieldset className="grupo">
        <legend>{t("propietarios.seccion_contacto")}</legend>

        <div className="lista-campos">
          <p className="etiqueta-lista">{t("propietarios.campo_telefonos")}</p>
          {telefonos.map((tel, i) => (
            <div className="fila-lista" key={tel.k}>
              <select name="telefono_tipo" defaultValue={tel.tipo} aria-label={t("propietarios.campo_telefono_tipo")}>
                {TIPOS_TELEFONO.map((tipo) => (
                  <option key={tipo} value={tipo}>{t(`propietarios.tel_${tipo}`)}</option>
                ))}
              </select>
              <input name="telefono_numero" type="tel" defaultValue={tel.numero} aria-label={t("propietarios.campo_telefono_numero")} />
              {telefonos.length > 1 && (
                <button type="button" className="boton-texto" onClick={() => setTelefonos(telefonos.filter((_, j) => j !== i))}>
                  {t("app.quitar")}
                </button>
              )}
            </div>
          ))}
          {error("telefonos")}
          <button type="button" className="boton-texto" onClick={() => setTelefonos([...telefonos, { tipo: "celular", numero: "", k: nuevaClave() }])}>
            {t("propietarios.agregar_telefono")}
          </button>
        </div>

        <div className="lista-campos">
          <p className="etiqueta-lista">{t("propietarios.campo_emails")}</p>
          {emails.map((mail, i) => (
            <div className="fila-lista" key={mail.k}>
              <input name="email_valor" type="email" defaultValue={mail.email} aria-label={t("propietarios.campo_email")} />
              <label className="casilla">
                <input type="radio" name="email_principal" value={i} checked={principal === i} onChange={() => setPrincipal(i)} />
                {t("propietarios.campo_email_principal")}
              </label>
              {emails.length > 1 && (
                <button
                  type="button"
                  className="boton-texto"
                  onClick={() => {
                    setEmails(emails.filter((_, j) => j !== i));
                    setPrincipal(0);
                  }}
                >
                  {t("app.quitar")}
                </button>
              )}
            </div>
          ))}
          {error("emails")}
          <button type="button" className="boton-texto" onClick={() => setEmails([...emails, { email: "", principal: false, k: nuevaClave() }])}>
            {t("propietarios.agregar_email")}
          </button>
        </div>
      </fieldset>

      <fieldset className="grupo">
        <legend>{t("propietarios.seccion_apoderado")}</legend>
        <div className="fila fila-2">
          <div className="campo">
            <label htmlFor="apoderadoNombre">{t("propietarios.campo_apoderado_nombre")}</label>
            <input id="apoderadoNombre" name="apoderadoNombre" type="text" defaultValue={valores.apoderadoNombre} />
          </div>
          <div className="campo">
            <label htmlFor="apoderadoContacto">{t("propietarios.campo_apoderado_contacto")}</label>
            <input id="apoderadoContacto" name="apoderadoContacto" type="text" defaultValue={valores.apoderadoContacto} />
          </div>
        </div>
      </fieldset>

      <fieldset className="grupo">
        <legend>{t("propietarios.seccion_liquidacion")}</legend>
        <div className="fila fila-3">
          <div className="campo">
            <label htmlFor="periodicidadLiquidacion">{t("propietarios.campo_periodicidad")}</label>
            <select id="periodicidadLiquidacion" name="periodicidadLiquidacion" defaultValue={valores.periodicidadLiquidacion}>
              {PERIODICIDADES.map((p) => (
                <option key={p} value={p}>{t(`propietarios.per_${p}`)}</option>
              ))}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="diaLiquidacion">{t("propietarios.campo_dia")}</label>
            <input id="diaLiquidacion" name="diaLiquidacion" type="number" min={1} max={31} defaultValue={valores.diaLiquidacion} />
            {error("diaLiquidacion")}
          </div>
          <div className="campo">
            <label htmlFor="horizonteResumenDias">{t("propietarios.campo_horizonte")}</label>
            <input id="horizonteResumenDias" name="horizonteResumenDias" type="number" min={1} defaultValue={valores.horizonteResumenDias} />
            {error("horizonteResumenDias")}
          </div>
        </div>
        <div className="fila fila-2">
          <div className="campo">
            <label htmlFor="fondoReservaArs">{t("propietarios.campo_fondo_ars")}</label>
            <input id="fondoReservaArs" name="fondoReservaArs" type="text" inputMode="decimal" defaultValue={valores.fondoReservaArs} />
            {error("fondoReservaArs")}
          </div>
          <div className="campo">
            <label htmlFor="fondoReservaUsd">{t("propietarios.campo_fondo_usd")}</label>
            <input id="fondoReservaUsd" name="fondoReservaUsd" type="text" inputMode="decimal" defaultValue={valores.fondoReservaUsd} />
            {error("fondoReservaUsd")}
          </div>
        </div>
        <div className="campo">
          <label htmlFor="observaciones">{t("propietarios.campo_observaciones")}</label>
          <textarea id="observaciones" name="observaciones" rows={3} defaultValue={valores.observaciones} />
        </div>
      </fieldset>

      <div className="acciones">
        <Link href={cancelarHref} className="boton boton-secundario">{t("app.cancelar")}</Link>
        <button type="submit" className="boton" disabled={pendiente}>{t("app.guardar")}</button>
      </div>
    </form>
  );
}
