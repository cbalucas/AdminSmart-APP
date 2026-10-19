"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { t } from "@ai/i18n";
import { aCentavos, formatearImporte, TIPOS_MOVIMIENTO_MANUAL, tipoDeCambioDelTraspaso, type Moneda } from "@ai/domain";
import { CampoAdjuntos } from "@/components/CampoAdjuntos";
import type { EstadoFormularioMovimiento } from "@/lib/formulario-movimiento";

type Accion = (anterior: EstadoFormularioMovimiento, formulario: FormData) => Promise<EstadoFormularioMovimiento>;

interface Comun {
  accion: Accion;
  propietario: { id: string; nombre: string };
  bienes: { id: string; nombre: string }[];
  hoy: string;
  cancelarHref: string;
}

function usarFormulario(accion: Accion) {
  const [estado, enviar, enviando] = useActionState(accion, {} as EstadoFormularioMovimiento);
  const [, iniciar] = useTransition();
  const errores = estado.errores ?? {};
  const error = (campo: string) =>
    errores[campo] ? (
      <span className="error-campo" role="alert">
        {t(errores[campo])}
      </span>
    ) : null;
  // Se envía por onSubmit y no por action: así React no vacía los campos cuando hay un error.
  const alEnviar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    iniciar(() => enviar(datos));
  };
  return { estado, enviando, error, alEnviar };
}

function AvisoExceso({ saldo, etiqueta }: { saldo: string; etiqueta: string }) {
  return (
    <div className="aviso-advertencia" role="alert">
      <p>{t("cuentas.aviso_exceso", { saldo })}</p>
      <label className="casilla">
        <input type="checkbox" name="confirmarExceso" />
        {etiqueta}
      </label>
    </div>
  );
}

// P-33 Movimiento manual: depósito, transferencia, gasto extraordinario o ajuste (solo administrador).
export function FormularioMovimiento({
  accion, propietario, bienes, hoy, cancelarHref, moneda: monedaInicial, movimientoId, organizacionId,
}: Comun & { moneda: Moneda; movimientoId: string; organizacionId: string }) {
  const { estado, enviando, error, alEnviar } = usarFormulario(accion);
  const [tipo, setTipo] = useState<string>("deposito_propietario");

  return (
    <form onSubmit={alEnviar} className="formulario-ancho" noValidate>
      {estado.error && <p className="aviso-error" role="alert">{t(estado.error)}</p>}
      <input type="hidden" name="propietarioId" value={propietario.id} />

      <fieldset className="grupo">
        <legend>{t("cuentas.seccion_movimiento")}</legend>
        <p className="muted">{t("cuentas.de_propietario", { nombre: propietario.nombre })}</p>
        <div className="fila fila-2">
          <div className="campo">
            <label htmlFor="tipo">{t("cuentas.col_tipo")}</label>
            <select id="tipo" name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              {TIPOS_MOVIMIENTO_MANUAL.map((x) => (
                <option key={x} value={x}>{t(`cuentas.tipo_${x}`)}</option>
              ))}
            </select>
            <span className="muted">{t(`cuentas.efecto_${tipo}`)}</span>
          </div>
          {tipo === "ajuste_manual" ? (
            <div className="campo">
              <label htmlFor="ajuste">{t("cuentas.ajuste_sentido")}</label>
              <select id="ajuste" name="ajuste" defaultValue="debe">
                <option value="debe">{t("cuentas.ajuste_debe")}</option>
                <option value="haber">{t("cuentas.ajuste_haber")}</option>
              </select>
            </div>
          ) : (
            <div />
          )}
        </div>
        <div className="fila fila-2">
          <div className="campo">
            <label htmlFor="bienId">{t("cuentas.bien")}</label>
            <select id="bienId" name="bienId" defaultValue={bienes[0]?.id ?? ""} aria-invalid={Boolean(estado.errores?.bienId)}>
              <option value="">—</option>
              {bienes.map((b) => (
                <option key={b.id} value={b.id}>{b.nombre}</option>
              ))}
            </select>
            {error("bienId")}
          </div>
          <div className="campo">
            <label htmlFor="moneda">{t("obligaciones.campo_moneda")}</label>
            <select id="moneda" name="moneda" defaultValue={monedaInicial}>
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>
        <div className="fila fila-2">
          <div className="campo">
            <label htmlFor="fecha">{t("pagos.campo_fecha")}</label>
            <input id="fecha" name="fecha" type="date" defaultValue={hoy} aria-invalid={Boolean(estado.errores?.fecha)} />
            {error("fecha")}
          </div>
          <div className="campo">
            <label htmlFor="importe">{t("cuentas.importe")}</label>
            <input id="importe" name="importe" type="text" inputMode="decimal" aria-invalid={Boolean(estado.errores?.importe)} />
            {error("importe")}
          </div>
        </div>
        <div className="campo">
          <label htmlFor="descripcion">{t("obligaciones.campo_descripcion")}</label>
          <input id="descripcion" name="descripcion" type="text" placeholder={t("cuentas.placeholder_descripcion")} aria-invalid={Boolean(estado.errores?.descripcion)} />
          {error("descripcion")}
        </div>
      </fieldset>

      <fieldset className="grupo">
        <legend>{t("cuentas.seccion_comprobante")}</legend>
        <CampoAdjuntos organizacionId={organizacionId} entidad="movimiento" entidadId={movimientoId} tipo="comprobante" existentes={[]} etiqueta={t("pagos.campo_comprobante")} />
      </fieldset>

      {estado.avisoExceso && <AvisoExceso saldo={estado.avisoExceso} etiqueta={t("cuentas.confirmar_exceso")} />}

      <div className="acciones">
        <Link href={cancelarHref} className="boton boton-secundario">{t("app.cancelar")}</Link>
        <button type="submit" className="boton" disabled={enviando}>{t("app.guardar")}</button>
      </div>
    </form>
  );
}

// MOV-04 Traspaso entre pesos y dólares: importe de origen, importe de destino y tipo de cambio resultante.
export function FormularioTraspaso({ accion, propietario, bienes, hoy, cancelarHref, monedaInicial }: Comun & { monedaInicial: Moneda }) {
  const { estado, enviando, error, alEnviar } = usarFormulario(accion);
  const [origen, setOrigen] = useState<Moneda>(monedaInicial);
  const [importeOrigen, setImporteOrigen] = useState("");
  const [importeDestino, setImporteDestino] = useState("");
  const destino: Moneda = origen === "ARS" ? "USD" : "ARS";

  const o = aCentavos(importeOrigen);
  const d = aCentavos(importeDestino);
  const cambio = o && d && o > 0 && d > 0 ? tipoDeCambioDelTraspaso({ moneda: origen, centavos: o }, { moneda: destino, centavos: d }) : null;

  return (
    <form onSubmit={alEnviar} className="formulario-ancho" noValidate>
      {estado.error && <p className="aviso-error" role="alert">{t(estado.error)}</p>}
      <input type="hidden" name="propietarioId" value={propietario.id} />

      <fieldset className="grupo">
        <legend>{t("cuentas.seccion_traspaso")}</legend>
        <p className="muted">{t("cuentas.de_propietario", { nombre: propietario.nombre })}</p>
        <div className="fila fila-2">
          <div className="campo">
            <label htmlFor="monedaOrigen">{t("cuentas.sale_de")}</label>
            <select id="monedaOrigen" name="monedaOrigen" value={origen} onChange={(e) => setOrigen(e.target.value as Moneda)}>
              <option value="ARS">{t("cuentas.pesos")}</option>
              <option value="USD">{t("cuentas.dolares")}</option>
            </select>
          </div>
          <div className="campo">
            <label htmlFor="bienId">{t("cuentas.bien")}</label>
            <select id="bienId" name="bienId" defaultValue={bienes[0]?.id ?? ""} aria-invalid={Boolean(estado.errores?.bienId)}>
              <option value="">—</option>
              {bienes.map((b) => (
                <option key={b.id} value={b.id}>{b.nombre}</option>
              ))}
            </select>
            {error("bienId")}
          </div>
        </div>
        <div className="fila fila-2">
          <div className="campo">
            <label htmlFor="importeOrigen">{t("cuentas.importe_origen", { moneda: origen })}</label>
            <input id="importeOrigen" name="importeOrigen" type="text" inputMode="decimal" value={importeOrigen} onChange={(e) => setImporteOrigen(e.target.value)} aria-invalid={Boolean(estado.errores?.importeOrigen)} />
            {error("importeOrigen")}
          </div>
          <div className="campo">
            <label htmlFor="importeDestino">{t("cuentas.importe_destino", { moneda: destino })}</label>
            <input id="importeDestino" name="importeDestino" type="text" inputMode="decimal" value={importeDestino} onChange={(e) => setImporteDestino(e.target.value)} aria-invalid={Boolean(estado.errores?.importeDestino)} />
            {error("importeDestino")}
          </div>
        </div>
        <p className="tipo-cambio">
          {cambio === null
            ? t("cuentas.tipo_cambio_ayuda")
            : t("cuentas.tipo_cambio", { cambio: formatearImporte(Math.round(cambio * 100), "ARS") })}
        </p>
        <div className="fila fila-2">
          <div className="campo">
            <label htmlFor="fecha">{t("pagos.campo_fecha")}</label>
            <input id="fecha" name="fecha" type="date" defaultValue={hoy} aria-invalid={Boolean(estado.errores?.fecha)} />
            {error("fecha")}
          </div>
          <div className="campo">
            <label htmlFor="descripcion">{t("cuentas.nota_opcional")}</label>
            <input id="descripcion" name="descripcion" type="text" />
          </div>
        </div>
      </fieldset>

      {estado.avisoExceso && <AvisoExceso saldo={estado.avisoExceso} etiqueta={t("cuentas.confirmar_exceso")} />}

      <div className="acciones">
        <Link href={cancelarHref} className="boton boton-secundario">{t("app.cancelar")}</Link>
        <button type="submit" className="boton" disabled={enviando}>{t("cuentas.registrar_traspaso")}</button>
      </div>
    </form>
  );
}
