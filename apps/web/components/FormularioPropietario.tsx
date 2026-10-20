"use client";

import { useActionState, useRef, useState } from "react";
import { t } from "@ai/i18n";
import { PERIODICIDADES, TIPOS_TELEFONO } from "@ai/domain";
import { AccionesFormulario, BotonIcono, CampoIcono, SeccionFormulario } from "@/components/ElementosFormulario";
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

      <SeccionFormulario icono="propietarios" titulo={t("propietarios.seccion_datos")}>
        <div className="fila fila-tipo-nombre">
          <div className="campo">
            <label htmlFor="tipoPersona">{t("propietarios.campo_tipo")}</label>
            <CampoIcono icono="propietarios">
              <select id="tipoPersona" name="tipoPersona" defaultValue={valores.tipoPersona}>
                <option value="humana">{t("propietarios.tipo_humana")}</option>
                <option value="juridica">{t("propietarios.tipo_juridica")}</option>
              </select>
            </CampoIcono>
          </div>
          <div className="campo">
            <label htmlFor="nombre">{t("propietarios.campo_nombre")}</label>
            <CampoIcono icono="persona">
              <input id="nombre" name="nombre" type="text" defaultValue={valores.nombre} aria-invalid={Boolean(errores.nombre)} required />
            </CampoIcono>
            {error("nombre")}
          </div>
        </div>
      </SeccionFormulario>

      <SeccionFormulario icono="telefono" titulo={t("propietarios.seccion_contacto")}>

        <div className="lista-campos">
          <p className="etiqueta-lista">{t("propietarios.campo_telefonos")}</p>
          {telefonos.map((tel, i) => (
            <div className="fila-lista" key={tel.k}>
              <select name="telefono_tipo" defaultValue={tel.tipo} aria-label={t("propietarios.campo_telefono_tipo")}>
                {TIPOS_TELEFONO.map((tipo) => (
                  <option key={tipo} value={tipo}>{t(`propietarios.tel_${tipo}`)}</option>
                ))}
              </select>
              <CampoIcono icono="telefono">
                <input name="telefono_numero" type="tel" defaultValue={tel.numero} aria-label={t("propietarios.campo_telefono_numero")} />
              </CampoIcono>
              {telefonos.length > 1 && (
                <BotonIcono icono="quitar" tono="peligro" titulo={t("app.quitar")} onClick={() => setTelefonos(telefonos.filter((_, j) => j !== i))} />
              )}
            </div>
          ))}
          {error("telefonos")}
          <BotonIcono icono="mas" tono="acento" titulo={t("propietarios.agregar_telefono")} onClick={() => setTelefonos([...telefonos, { tipo: "celular", numero: "", k: nuevaClave() }])} />
        </div>

        <div className="lista-campos">
          <p className="etiqueta-lista">{t("propietarios.campo_emails")}</p>
          {emails.map((mail, i) => (
            <div className="fila-lista" key={mail.k}>
              <CampoIcono icono="mail">
                <input name="email_valor" type="email" defaultValue={mail.email} aria-label={t("propietarios.campo_email")} />
              </CampoIcono>
              <label className="casilla">
                <input type="radio" name="email_principal" value={i} checked={principal === i} onChange={() => setPrincipal(i)} />
                {t("propietarios.campo_email_principal")}
              </label>
              {emails.length > 1 && (
                <BotonIcono
                  icono="quitar"
                  tono="peligro"
                  titulo={t("app.quitar")}
                  onClick={() => {
                    setEmails(emails.filter((_, j) => j !== i));
                    setPrincipal(0);
                  }}
                />
              )}
            </div>
          ))}
          {error("emails")}
          <BotonIcono icono="mas" tono="acento" titulo={t("propietarios.agregar_email")} onClick={() => setEmails([...emails, { email: "", principal: false, k: nuevaClave() }])} />
        </div>
      </SeccionFormulario>

      <SeccionFormulario icono="contratos" titulo={t("propietarios.seccion_apoderado")}>
        <div className="fila fila-2">
          <div className="campo">
            <label htmlFor="apoderadoNombre">{t("propietarios.campo_apoderado_nombre")}</label>
            <CampoIcono icono="persona">
              <input id="apoderadoNombre" name="apoderadoNombre" type="text" defaultValue={valores.apoderadoNombre} />
            </CampoIcono>
          </div>
          <div className="campo">
            <label htmlFor="apoderadoContacto">{t("propietarios.campo_apoderado_contacto")}</label>
            <CampoIcono icono="telefono">
              <input id="apoderadoContacto" name="apoderadoContacto" type="text" defaultValue={valores.apoderadoContacto} />
            </CampoIcono>
          </div>
        </div>
      </SeccionFormulario>

      <SeccionFormulario icono="liquidaciones" titulo={t("propietarios.seccion_liquidacion")}>
        <div className="fila fila-3">
          <div className="campo">
            <label htmlFor="periodicidadLiquidacion">{t("propietarios.campo_periodicidad")}</label>
            <CampoIcono icono="recurrente">
              <select id="periodicidadLiquidacion" name="periodicidadLiquidacion" defaultValue={valores.periodicidadLiquidacion}>
                {PERIODICIDADES.map((p) => (
                  <option key={p} value={p}>{t(`propietarios.per_${p}`)}</option>
                ))}
              </select>
            </CampoIcono>
          </div>
          <div className="campo">
            <label htmlFor="diaLiquidacion">{t("propietarios.campo_dia")}</label>
            <CampoIcono icono="calendario">
              <input id="diaLiquidacion" name="diaLiquidacion" type="number" min={1} max={31} defaultValue={valores.diaLiquidacion} />
            </CampoIcono>
            {error("diaLiquidacion")}
          </div>
          <div className="campo">
            <label htmlFor="horizonteResumenDias">{t("propietarios.campo_horizonte")}</label>
            <CampoIcono icono="calendario">
              <input id="horizonteResumenDias" name="horizonteResumenDias" type="number" min={1} defaultValue={valores.horizonteResumenDias} />
            </CampoIcono>
            {error("horizonteResumenDias")}
          </div>
        </div>
        <div className="fila fila-2">
          <div className="campo">
            <label htmlFor="fondoReservaArs">{t("propietarios.campo_fondo_ars")}</label>
            <CampoIcono icono="dinero">
              <input id="fondoReservaArs" name="fondoReservaArs" type="text" inputMode="decimal" defaultValue={valores.fondoReservaArs} />
            </CampoIcono>
            {error("fondoReservaArs")}
          </div>
          <div className="campo">
            <label htmlFor="fondoReservaUsd">{t("propietarios.campo_fondo_usd")}</label>
            <CampoIcono icono="dinero">
              <input id="fondoReservaUsd" name="fondoReservaUsd" type="text" inputMode="decimal" defaultValue={valores.fondoReservaUsd} />
            </CampoIcono>
            {error("fondoReservaUsd")}
          </div>
        </div>
        <div className="campo">
          <label htmlFor="observaciones">{t("propietarios.campo_observaciones")}</label>
          <textarea id="observaciones" name="observaciones" rows={3} defaultValue={valores.observaciones} />
        </div>
      </SeccionFormulario>

      <AccionesFormulario cancelarHref={cancelarHref} pendiente={pendiente} />
    </form>
  );
}
