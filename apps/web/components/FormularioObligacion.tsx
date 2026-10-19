"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { t } from "@ai/i18n";
import { formatearImporte, PERIODICIDADES_SERVICIO, resolverResponsable } from "@ai/domain";
import type { EstadoFormularioObligacion } from "@/lib/formulario-obligacion";

export interface BienOpcion {
  id: string;
  nombre: string;
  alquilado: boolean;
}

export interface ServicioOpcion {
  id: string;
  bienId: string;
  conceptoId: string;
  etiqueta: string; // "Agua · Aguas Cordobesas"
  responsableDefault: "propietario" | "inquilino";
  periodicidad: string | null;
  montoEstimado: number | null;
  monedaEstimada: "ARS" | "USD" | null;
}

export interface ValoresObligacion {
  bienId: string;
  bienServicioId: string;
  conceptoId: string;
  periodo: string; // AAAA-MM
  esRecurrente: boolean;
  frecuencia: string;
  monto: string;
  moneda: string;
  responsable: string;
  vencimiento: string;
  descripcion: string;
  codigoPago: string;
  observaciones: string;
}

type Accion = (anterior: EstadoFormularioObligacion, formulario: FormData) => Promise<EstadoFormularioObligacion>;

// P-27 Alta y edición de obligación. En la edición, bien, servicio, concepto y período quedan fijos.
export function FormularioObligacion({
  accion,
  valores,
  bienes,
  servicios,
  conceptos,
  cancelarHref,
  fijos,
}: {
  accion: Accion;
  valores: ValoresObligacion;
  bienes: BienOpcion[];
  servicios: ServicioOpcion[];
  conceptos: { id: string; nombre: string }[];
  cancelarHref: string;
  /** Edición: texto de lo que no se puede cambiar. */
  fijos?: { bien: string; concepto: string; periodo: string };
}) {
  const [estado, enviar, enviando] = useActionState(accion, {} as EstadoFormularioObligacion);
  const [, iniciar] = useTransition();
  const pendiente = enviando;
  const errores = estado.errores ?? {};
  const error = (campo: string) =>
    errores[campo] ? (
      <span className="error-campo" role="alert">
        {t(errores[campo])}
      </span>
    ) : null;

  const [bienId, setBienId] = useState(valores.bienId);
  const [servicioId, setServicioId] = useState(valores.bienServicioId);
  const [conceptoId, setConceptoId] = useState(valores.conceptoId);
  const [esRecurrente, setEsRecurrente] = useState(valores.esRecurrente);
  const [frecuencia, setFrecuencia] = useState(valores.frecuencia);
  const [moneda, setMoneda] = useState(valores.moneda);
  const [responsable, setResponsable] = useState(valores.responsable);

  const serviciosDelBien = servicios.filter((s) => s.bienId === bienId);
  const servicio = servicios.find((s) => s.id === servicioId);
  const bien = bienes.find((b) => b.id === bienId);
  const editando = Boolean(fijos);

  function elegirBien(id: string) {
    setBienId(id);
    setServicioId("");
  }

  // Al elegir el servicio se precargan concepto, frecuencia (SERV-02), responsable (RN-01) y moneda.
  function elegirServicio(id: string) {
    setServicioId(id);
    const s = servicios.find((x) => x.id === id);
    if (!s) return;
    setConceptoId(s.conceptoId);
    setEsRecurrente(s.periodicidad !== null);
    setFrecuencia(s.periodicidad ?? "");
    setResponsable(resolverResponsable(Boolean(bien?.alquilado), s.responsableDefault));
    setMoneda(s.monedaEstimada ?? "ARS");
  }

  const esSuelto = servicioId === "" && !editando;

  // Se envía por onSubmit y no por action: así React no vacía los campos cuando hay un error.
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

      <fieldset className="grupo">
        <legend>{t("obligaciones.seccion_que")}</legend>
        {editando ? (
          <>
            <input type="hidden" name="bienId" value={valores.bienId} />
            <input type="hidden" name="bienServicioId" value={valores.bienServicioId} />
            <input type="hidden" name="conceptoId" value={valores.conceptoId} />
            <input type="hidden" name="periodo" value={valores.periodo} />
            <input type="hidden" name="descripcion" value={valores.descripcion} />
            <p className="muted">{t("obligaciones.ayuda_fijos")}</p>
            <div className="fila fila-2">
              <div className="campo">
                <span className="etiqueta-lista">{t("obligaciones.campo_bien")}</span>
                <strong>{fijos?.bien}</strong>
              </div>
              <div className="campo">
                <span className="etiqueta-lista">{t("obligaciones.campo_concepto")}</span>
                <strong>{fijos?.concepto}</strong>
                {valores.descripcion && <span className="muted">{valores.descripcion}</span>}
              </div>
            </div>
            <div className="campo">
              <span className="etiqueta-lista">{t("obligaciones.campo_periodo")}</span>
              <strong>{fijos?.periodo}</strong>
            </div>
          </>
        ) : (
          <>
            <div className="fila fila-2">
              <div className="campo">
                <label htmlFor="bienId">{t("obligaciones.campo_bien")}</label>
                <select id="bienId" name="bienId" value={bienId} onChange={(e) => elegirBien(e.target.value)} aria-invalid={Boolean(errores.bienId)}>
                  <option value="">—</option>
                  {bienes.map((b) => (
                    <option key={b.id} value={b.id}>{b.nombre}</option>
                  ))}
                </select>
                {error("bienId")}
              </div>
              <div className="campo">
                <label htmlFor="bienServicioId">{t("obligaciones.campo_servicio")}</label>
                <select id="bienServicioId" name="bienServicioId" value={servicioId} onChange={(e) => elegirServicio(e.target.value)} disabled={!bienId}>
                  <option value="">{t("obligaciones.gasto_suelto")}</option>
                  {serviciosDelBien.map((s) => (
                    <option key={s.id} value={s.id}>{s.etiqueta}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="fila fila-2">
              <div className="campo">
                <label htmlFor="conceptoId">{t("obligaciones.campo_concepto")}</label>
                {servicio ? (
                  <>
                    <input type="hidden" name="conceptoId" value={conceptoId} />
                    <select id="conceptoId" value={conceptoId} disabled>
                      {conceptos.map((c) => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                      ))}
                    </select>
                  </>
                ) : (
                  <select id="conceptoId" name="conceptoId" value={conceptoId} onChange={(e) => setConceptoId(e.target.value)} aria-invalid={Boolean(errores.conceptoId)}>
                    <option value="">—</option>
                    {conceptos.map((c) => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                )}
                {error("conceptoId")}
              </div>
              <div className="campo">
                <label htmlFor="periodo">{t("obligaciones.campo_periodo")}</label>
                <input id="periodo" name="periodo" type="month" defaultValue={valores.periodo} aria-invalid={Boolean(errores.periodo)} />
                {error("periodo")}
              </div>
            </div>
            {esSuelto && (
              <div className="campo">
                <label htmlFor="descripcion">{t("obligaciones.campo_descripcion")}</label>
                <input id="descripcion" name="descripcion" type="text" defaultValue={valores.descripcion} placeholder={t("obligaciones.placeholder_descripcion")} aria-invalid={Boolean(errores.descripcion)} />
                {error("descripcion")}
              </div>
            )}
          </>
        )}
      </fieldset>

      <fieldset className="grupo">
        <legend>{t("obligaciones.seccion_importe")}</legend>
        <div className="fila fila-calle">
          <div className="campo">
            <label htmlFor="monto">{t("obligaciones.campo_monto")}</label>
            <input id="monto" name="monto" type="text" inputMode="decimal" defaultValue={valores.monto} aria-invalid={Boolean(errores.monto)} />
            {error("monto")}
            <span className="muted">
              {servicio?.montoEstimado
                ? t("obligaciones.estimado", { monto: formatearImporte(servicio.montoEstimado, servicio.monedaEstimada ?? "ARS") })
                : t("obligaciones.ayuda_monto")}
            </span>
          </div>
          <div className="campo">
            <label htmlFor="moneda">{t("obligaciones.campo_moneda")}</label>
            <select id="moneda" name="moneda" value={moneda} onChange={(e) => setMoneda(e.target.value)}>
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>
        <div className="fila fila-2">
          <div className="campo">
            <label htmlFor="vencimiento">{t("obligaciones.campo_vencimiento")}</label>
            <input id="vencimiento" name="vencimiento" type="date" defaultValue={valores.vencimiento} aria-invalid={Boolean(errores.vencimiento)} />
            {error("vencimiento")}
          </div>
          <div className="campo">
            <label htmlFor="responsable">{t("obligaciones.campo_responsable")}</label>
            <select id="responsable" name="responsable" value={responsable} onChange={(e) => setResponsable(e.target.value)}>
              <option value="propietario">{t("obligaciones.responsable_propietario")}</option>
              <option value="inquilino">{t("obligaciones.responsable_inquilino")}</option>
            </select>
          </div>
        </div>
      </fieldset>

      <fieldset className="grupo">
        <legend>{t("obligaciones.seccion_recurrencia")}</legend>
        <p className="muted">{t("obligaciones.ayuda_recurrencia")}</p>
        <div className="fila fila-2">
          <label className="casilla">
            <input type="checkbox" name="esRecurrente" checked={esRecurrente} onChange={(e) => setEsRecurrente(e.target.checked)} />
            {t("obligaciones.campo_recurrente")}
          </label>
          <div className="campo">
            <label htmlFor="frecuencia">{t("obligaciones.campo_frecuencia")}</label>
            <select id="frecuencia" name="frecuencia" value={frecuencia} onChange={(e) => setFrecuencia(e.target.value)} disabled={!esRecurrente} aria-invalid={Boolean(errores.frecuencia)}>
              <option value="">—</option>
              {PERIODICIDADES_SERVICIO.map((p) => (
                <option key={p} value={p}>{t(`obligaciones.frec_${p}`)}</option>
              ))}
            </select>
            {error("frecuencia")}
          </div>
        </div>
      </fieldset>

      <fieldset className="grupo">
        <legend>{t("obligaciones.seccion_otros")}</legend>
        <div className="campo">
          <label htmlFor="codigoPago">{t("obligaciones.campo_codigo_pago")}</label>
          <input id="codigoPago" name="codigoPago" type="text" defaultValue={valores.codigoPago} />
        </div>
        <div className="campo">
          <label htmlFor="observaciones">{t("obligaciones.campo_observaciones")}</label>
          <textarea id="observaciones" name="observaciones" rows={3} defaultValue={valores.observaciones} placeholder={t("obligaciones.placeholder_observaciones")} />
        </div>
      </fieldset>

      <div className="acciones">
        <Link href={cancelarHref} className="boton boton-secundario">{t("app.cancelar")}</Link>
        <button type="submit" className="boton" disabled={pendiente}>{t("app.guardar")}</button>
      </div>
    </form>
  );
}
