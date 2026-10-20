"use client";

import { useActionState, useState, useTransition } from "react";
import { t } from "@ai/i18n";
import { AccionesFormulario, CampoIcono, SeccionFormulario } from "@/components/ElementosFormulario";
import { aCentavos, formatearImporte, MEDIOS_PAGO, resolverResponsable, type Moneda } from "@ai/domain";
import { CampoAdjuntos } from "@/components/CampoAdjuntos";
import type { BienOpcion } from "@/components/FormularioObligacion";
import type { EstadoFormularioPago } from "@/lib/formulario-pago";

export interface ResumenObligacion {
  concepto: string;
  periodo: string; // ya formateado
  bien: string;
  monto: number | null;
  moneda: Moneda;
  responsable: "propietario" | "inquilino";
  estado: string;
}

type Accion = (anterior: EstadoFormularioPago, formulario: FormData) => Promise<EstadoFormularioPago>;

// Texto es-AR editable: 4130050 → "41300,50".
const aTextoEditable = (centavos: number | null) =>
  centavos === null ? "" : (centavos / 100).toFixed(2).replace(".", ",").replace(/,00$/, "");

// P-28 Registrar pago: de una obligación existente o directo (PAG-02, sin obligación previa).
export function FormularioPago({
  accion,
  hoy,
  pagoId,
  organizacionId,
  cancelarHref,
  obligacion,
  directo,
  monedaDefecto = "ARS",
}: {
  accion: Accion;
  hoy: string;
  pagoId: string;
  organizacionId: string;
  cancelarHref: string;
  obligacion?: ResumenObligacion;
  directo?: { bienes: BienOpcion[]; conceptos: { id: string; nombre: string }[] };
  monedaDefecto?: Moneda;
}) {
  const [estado, enviar, enviando] = useActionState(accion, {} as EstadoFormularioPago);
  const [, iniciar] = useTransition();
  const errores = estado.errores ?? {};
  const error = (campo: string) =>
    errores[campo] ? (
      <span className="error-campo" role="alert">
        {t(errores[campo])}
      </span>
    ) : null;

  const [importe, setImporte] = useState(aTextoEditable(obligacion?.monto ?? null));
  const [moneda, setMoneda] = useState<Moneda>(obligacion?.moneda ?? monedaDefecto);
  const [pagadoPor, setPagadoPor] = useState("administracion");
  const [bienId, setBienId] = useState("");
  const [responsable, setResponsable] = useState(obligacion?.responsable ?? "propietario");

  const monto = obligacion?.monto ?? null;
  const centavos = aCentavos(importe);
  const hayDiferencia = monto !== null && centavos !== null && centavos > 0 && centavos !== monto;
  const monedaPago = obligacion?.moneda ?? moneda;

  function elegirBien(id: string) {
    setBienId(id);
    const b = directo?.bienes.find((x) => x.id === id);
    if (b) setResponsable(resolverResponsable(b.alquilado, "propietario"));
  }

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

      {obligacion && (
        <section className="grupo resumen-pago">
          <span className="etiqueta-lista">{t("pagos.obligacion")}</span>
          <strong>{obligacion.concepto} · {obligacion.periodo}</strong>
          <span className="muted">
            {obligacion.bien} · {t(`obligaciones.a_cargo_${obligacion.responsable}`)}
          </span>
          <span className="resumen-monto">
            {obligacion.monto === null ? <span className="falta-monto">{t("obligaciones.falta_monto")}</span> : formatearImporte(obligacion.monto, obligacion.moneda)}
          </span>
        </section>
      )}

      {directo && (
        <SeccionFormulario icono="obligaciones" titulo={t("pagos.seccion_gasto")}>
          <p className="muted">{t("pagos.ayuda_directo")}</p>
          <div className="fila fila-2">
            <div className="campo">
              <label htmlFor="bienId">{t("obligaciones.campo_bien")}</label>
              <CampoIcono icono="bienes">
                <select id="bienId" name="bienId" value={bienId} onChange={(e) => elegirBien(e.target.value)} aria-invalid={Boolean(errores.bienId)}>
                  <option value="">—</option>
                  {directo.bienes.map((b) => (
                    <option key={b.id} value={b.id}>{b.nombre}</option>
                  ))}
                </select>
              </CampoIcono>
              {error("bienId")}
            </div>
            <div className="campo">
              <label htmlFor="conceptoId">{t("obligaciones.campo_concepto")}</label>
              <CampoIcono icono="contratos">
                <select id="conceptoId" name="conceptoId" defaultValue="" aria-invalid={Boolean(errores.conceptoId)}>
                  <option value="">—</option>
                  {directo.conceptos.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </CampoIcono>
              {error("conceptoId")}
            </div>
          </div>
          <div className="campo">
            <label htmlFor="descripcion">{t("obligaciones.campo_descripcion")}</label>
            <CampoIcono icono="nota">
              <input id="descripcion" name="descripcion" type="text" placeholder={t("obligaciones.placeholder_descripcion")} aria-invalid={Boolean(errores.descripcion)} />
            </CampoIcono>
            {error("descripcion")}
          </div>
          <div className="fila fila-2">
            <div className="campo">
              <label htmlFor="responsable">{t("obligaciones.campo_responsable")}</label>
              <CampoIcono icono="persona">
                <select id="responsable" name="responsable" value={responsable} onChange={(e) => setResponsable(e.target.value as "propietario" | "inquilino")}>
                  <option value="propietario">{t("obligaciones.responsable_propietario")}</option>
                  <option value="inquilino">{t("obligaciones.responsable_inquilino")}</option>
                </select>
              </CampoIcono>
            </div>
            <div className="campo">
              <label htmlFor="moneda">{t("obligaciones.campo_moneda")}</label>
              <CampoIcono icono="dinero">
                <select id="moneda" name="moneda" value={moneda} onChange={(e) => setMoneda(e.target.value as Moneda)}>
                  <option value="ARS">ARS</option>
                  <option value="USD">USD</option>
                </select>
              </CampoIcono>
            </div>
          </div>
        </SeccionFormulario>
      )}

      <SeccionFormulario icono="dinero" titulo={t("pagos.seccion_pago")}>
        <div className="fila fila-2">
          <div className="campo">
            <label htmlFor="fecha">{t("pagos.campo_fecha")}</label>
            <CampoIcono icono="calendario">
              <input id="fecha" name="fecha" type="date" defaultValue={hoy} aria-invalid={Boolean(errores.fecha)} />
            </CampoIcono>
            {error("fecha")}
          </div>
          <div className="campo">
            <label htmlFor="importe">{t("pagos.campo_importe", { moneda: monedaPago })}</label>
            <CampoIcono icono="dinero">
              <input id="importe" name="importe" type="text" inputMode="decimal" value={importe} onChange={(e) => setImporte(e.target.value)} aria-invalid={Boolean(errores.importe)} />
            </CampoIcono>
            {error("importe")}
          </div>
        </div>

        {hayDiferencia && (
          <div className="aviso-advertencia" role="status">
            <p>
              {t("pagos.diferencia", {
                importe: formatearImporte(centavos as number, monedaPago),
                monto: formatearImporte(monto as number, monedaPago),
              })}
            </p>
            <label className="casilla">
              <input type="checkbox" name="confirmarDiferencia" />
              {t("pagos.confirmar_diferencia")}
            </label>
            <div className="campo">
              <label htmlFor="motivoDiferencia">{t("pagos.campo_motivo")}</label>
              <CampoIcono icono="nota">
                <input id="motivoDiferencia" name="motivoDiferencia" type="text" placeholder={t("pagos.placeholder_motivo")} aria-invalid={Boolean(errores.motivoDiferencia)} />
              </CampoIcono>
              {error("motivoDiferencia")}
            </div>
          </div>
        )}

        <div className="campo">
          <span className="etiqueta-lista" id="etiqueta-quien">{t("pagos.campo_quien")}</span>
          <div className="segmentado" role="radiogroup" aria-labelledby="etiqueta-quien">
            {(["administracion", "propietario_directo", "inquilino"] as const).map((x) => (
              <label key={x} className={pagadoPor === x ? "segmento activo" : "segmento"}>
                <input type="radio" name="pagadoPor" value={x} checked={pagadoPor === x} onChange={() => setPagadoPor(x)} />
                {t(`pagos.quien_${x}`)}
              </label>
            ))}
          </div>
          <span className="muted">{t(`pagos.efecto_${pagadoPor}`)}</span>
          {error("pagadoPor")}
        </div>

        <div className="fila fila-2">
          <div className="campo">
            <label htmlFor="medio">{t("pagos.campo_medio")}</label>
            <CampoIcono icono="cuentas">
              <select id="medio" name="medio" defaultValue="">
                <option value="">—</option>
                {MEDIOS_PAGO.map((m) => (
                  <option key={m} value={m}>{t(`pagos.medio_${m}`)}</option>
                ))}
              </select>
            </CampoIcono>
          </div>
          <div className="campo">
            <label htmlFor="nroOperacion">{t("pagos.campo_operacion")}</label>
            <CampoIcono icono="numero">
              <input id="nroOperacion" name="nroOperacion" type="text" placeholder={t("pagos.placeholder_operacion")} />
            </CampoIcono>
          </div>
        </div>
        <div className="campo">
          <label htmlFor="observaciones">{t("obligaciones.campo_observaciones")}</label>
          <textarea id="observaciones" name="observaciones" rows={2} />
        </div>
      </SeccionFormulario>

      <SeccionFormulario icono="documento" titulo={t("pagos.seccion_comprobante")}>
        <CampoAdjuntos organizacionId={organizacionId} entidad="pago" entidadId={pagoId} tipo="comprobante" existentes={[]} etiqueta={t("pagos.campo_comprobante")} />
      </SeccionFormulario>

      {estado.avisoSaldo && estado.avisoSaldo.length > 0 && (
        <div className="aviso-advertencia" role="alert">
          <p>{t("pagos.aviso_saldo", { nombres: estado.avisoSaldo.join(", ") })}</p>
          <label className="casilla">
            <input type="checkbox" name="confirmarSaldo" />
            {t("pagos.confirmar_saldo")}
          </label>
        </div>
      )}

      <AccionesFormulario cancelarHref={cancelarHref} pendiente={enviando} guardarTexto={t("pagos.guardar")} />
    </form>
  );
}
