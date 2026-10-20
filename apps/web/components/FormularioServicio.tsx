"use client";

import { useActionState } from "react";
import { t } from "@ai/i18n";
import { AccionesFormulario, CampoIcono, SeccionFormulario } from "@/components/ElementosFormulario";
import { PERIODICIDADES_SERVICIO } from "@ai/domain";
import type { EstadoFormularioServicio } from "@/lib/formulario-servicio";

export interface ValoresServicio {
  conceptoId: string;
  nroCuentaCliente: string;
  empresaPrestadora: string;
  responsableDefault: string;
  estado: string;
  titularServicio: string;
  periodicidad: string;
  diaVencimiento: string;
  montoEstimado: string;
  montoEstimadoMoneda: string;
  debitoAutomatico: boolean;
  sitioBoletas: string;
  observaciones: string;
}

export const SERVICIO_NUEVO: ValoresServicio = {
  conceptoId: "",
  nroCuentaCliente: "",
  empresaPrestadora: "",
  responsableDefault: "propietario",
  estado: "activo",
  titularServicio: "",
  periodicidad: "",
  diaVencimiento: "",
  montoEstimado: "",
  montoEstimadoMoneda: "ARS",
  debitoAutomatico: false,
  sitioBoletas: "",
  observaciones: "",
};

type Accion = (anterior: EstadoFormularioServicio, formulario: FormData) => Promise<EstadoFormularioServicio>;

// P-19 Servicio o impuesto del bien: alta y edición.
export function FormularioServicio({
  accion,
  valores,
  conceptos,
  empresas,
  cancelarHref,
  editando = false,
}: {
  accion: Accion;
  valores: ValoresServicio;
  conceptos: { id: string; nombre: string }[];
  empresas: string[];
  cancelarHref: string;
  editando?: boolean;
}) {
  const [estado, enviar, pendiente] = useActionState(accion, {} as EstadoFormularioServicio);
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

      <SeccionFormulario icono="obligaciones" titulo={t("servicios.seccion_servicio")}>
        <div className="fila fila-2">
          <div className="campo">
            <label htmlFor="conceptoId">{t("servicios.campo_concepto")}</label>
            <CampoIcono icono="contratos">
              <select id="conceptoId" name="conceptoId" defaultValue={valores.conceptoId} aria-invalid={Boolean(errores.conceptoId)}>
                <option value="">—</option>
                {conceptos.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </CampoIcono>
            {error("conceptoId")}
          </div>
          <div className="campo">
            <label htmlFor="responsableDefault">{t("servicios.campo_responsable")}</label>
            <CampoIcono icono="persona">
              <select id="responsableDefault" name="responsableDefault" defaultValue={valores.responsableDefault}>
                <option value="propietario">{t("servicios.responsable_propietario")}</option>
                <option value="inquilino">{t("servicios.responsable_inquilino")}</option>
              </select>
            </CampoIcono>
          </div>
        </div>
      </SeccionFormulario>

      <SeccionFormulario icono="cuentas" titulo={t("servicios.seccion_cuenta")}>
        <div className="fila fila-2">
          <div className="campo">
            <label htmlFor="nroCuentaCliente">{t("servicios.campo_cuenta")}</label>
            <CampoIcono icono="numero">
              <input id="nroCuentaCliente" name="nroCuentaCliente" type="text" defaultValue={valores.nroCuentaCliente} aria-invalid={Boolean(errores.nroCuentaCliente)} />
            </CampoIcono>
            {error("nroCuentaCliente")}
          </div>
          <div className="campo">
            <label htmlFor="empresaPrestadora">{t("servicios.campo_empresa")}</label>
            <CampoIcono icono="edificios">
              <input
                id="empresaPrestadora"
                name="empresaPrestadora"
                type="text"
                list="lista-empresas"
                autoComplete="off"
                defaultValue={valores.empresaPrestadora}
                aria-invalid={Boolean(errores.empresaPrestadora)}
              />
            </CampoIcono>
            <datalist id="lista-empresas">
              {empresas.map((e) => (
                <option key={e} value={e} />
              ))}
            </datalist>
            {error("empresaPrestadora")}
          </div>
        </div>
        <div className="campo">
          <label htmlFor="titularServicio">{t("servicios.campo_titular")}</label>
          <CampoIcono icono="persona">
            <input id="titularServicio" name="titularServicio" type="text" defaultValue={valores.titularServicio} />
          </CampoIcono>
        </div>
      </SeccionFormulario>

      <SeccionFormulario icono="dinero" titulo={t("servicios.seccion_pago")}>
        <p className="muted">{t("servicios.ayuda_periodicidad")}</p>
        <div className="fila fila-2">
          <div className="campo">
            <label htmlFor="periodicidad">{t("servicios.campo_periodicidad")}</label>
            <CampoIcono icono="recurrente">
              <select id="periodicidad" name="periodicidad" defaultValue={valores.periodicidad}>
                <option value="">{t("servicios.sin_periodicidad")}</option>
                {PERIODICIDADES_SERVICIO.map((p) => (
                  <option key={p} value={p}>{t(`propietarios.per_${p}`)}</option>
                ))}
              </select>
            </CampoIcono>
          </div>
          <div className="campo">
            <label htmlFor="diaVencimiento">{t("servicios.campo_dia")}</label>
            <CampoIcono icono="calendario">
              <input id="diaVencimiento" name="diaVencimiento" type="number" min={1} max={31} defaultValue={valores.diaVencimiento} aria-invalid={Boolean(errores.diaVencimiento)} />
            </CampoIcono>
            {error("diaVencimiento")}
          </div>
        </div>
        <div className="fila fila-calle">
          <div className="campo">
            <label htmlFor="montoEstimado">{t("servicios.campo_monto")}</label>
            <CampoIcono icono="dinero">
              <input id="montoEstimado" name="montoEstimado" type="text" inputMode="decimal" defaultValue={valores.montoEstimado} aria-invalid={Boolean(errores.montoEstimado)} />
            </CampoIcono>
            {error("montoEstimado")}
          </div>
          <div className="campo">
            <label htmlFor="montoEstimadoMoneda">{t("servicios.campo_moneda")}</label>
            <CampoIcono icono="dinero">
              <select id="montoEstimadoMoneda" name="montoEstimadoMoneda" defaultValue={valores.montoEstimadoMoneda}>
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
              </select>
            </CampoIcono>
          </div>
        </div>
        <label className="casilla">
          <input type="checkbox" name="debitoAutomatico" defaultChecked={valores.debitoAutomatico} />
          {t("servicios.campo_debito")}
        </label>
        <div className="campo">
          <label htmlFor="sitioBoletas">{t("servicios.campo_sitio")}</label>
          <CampoIcono icono="documento">
            <input id="sitioBoletas" name="sitioBoletas" type="text" inputMode="url" autoCapitalize="none" defaultValue={valores.sitioBoletas} aria-invalid={Boolean(errores.sitioBoletas)} />
          </CampoIcono>
          {error("sitioBoletas")}
        </div>
      </SeccionFormulario>

      <SeccionFormulario icono="nota" titulo={t("servicios.seccion_otros")}>
        {editando && (
          <div className="campo">
            <label htmlFor="estado">{t("servicios.campo_estado")}</label>
            <CampoIcono icono="info">
              <select id="estado" name="estado" defaultValue={valores.estado}>
                <option value="activo">{t("conceptos.activo")}</option>
                <option value="inactivo">{t("conceptos.inactivo")}</option>
              </select>
            </CampoIcono>
          </div>
        )}
        <div className="campo">
          <label htmlFor="observaciones">{t("servicios.campo_observaciones")}</label>
          <textarea id="observaciones" name="observaciones" rows={3} defaultValue={valores.observaciones} />
        </div>
      </SeccionFormulario>

      <AccionesFormulario cancelarHref={cancelarHref} pendiente={pendiente} />
    </form>
  );
}
