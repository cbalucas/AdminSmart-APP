"use client";

import { useActionState, useState, useTransition } from "react";
import { t } from "@ai/i18n";
import { AccionesFormulario, CampoIcono, SeccionFormulario } from "@/components/ElementosFormulario";
import { aCentavos, completarTraspaso, parsearCotizacion, TIPOS_MOVIMIENTO_MANUAL, type Moneda } from "@ai/domain";
import { CampoAdjuntos } from "@/components/CampoAdjuntos";
import type { EstadoFormularioMovimiento } from "@/lib/formulario-movimiento";

type Accion = (anterior: EstadoFormularioMovimiento, formulario: FormData) => Promise<EstadoFormularioMovimiento>;

interface Comun {
  accion: Accion;
  propietario: { id: string; nombre: string };
  bienes: { id: string; nombre: string; esGeneral: boolean }[];
  hoy: string;
  cancelarHref: string;
}

function useFormularioMovimiento(accion: Accion) {
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

// El depósito, la transferencia y el traspaso son del propietario y no de un bien: se imputan al bien
// general (Gastos varios). Solo el gasto extraordinario y el ajuste permiten elegir un bien.
function CampoBien({
  bienes, conSelector, error, invalido,
}: {
  bienes: { id: string; nombre: string; esGeneral: boolean }[];
  conSelector: boolean;
  error: React.ReactNode;
  invalido: boolean;
}) {
  const general = bienes.find((b) => b.esGeneral);
  if (general && !conSelector) return <input type="hidden" name="bienId" value={general.id} />;
  const ordenados = [...bienes].sort((a, b) => Number(b.esGeneral) - Number(a.esGeneral));
  return (
    <div className="campo">
      <label htmlFor="bienId">{t("cuentas.bien")}</label>
      <CampoIcono icono="bienes">
        <select id="bienId" name="bienId" defaultValue={ordenados[0]?.id ?? ""} aria-invalid={invalido}>
          {general ? null : <option value="">—</option>}
          {ordenados.map((b) => (
            <option key={b.id} value={b.id}>{b.esGeneral ? t("cuentas.general_opcion") : b.nombre}</option>
          ))}
        </select>
      </CampoIcono>
      {conSelector && <span className="muted">{t("cuentas.ayuda_bien")}</span>}
      {error}
    </div>
  );
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
  const { estado, enviando, error, alEnviar } = useFormularioMovimiento(accion);
  const [tipo, setTipo] = useState<string>("deposito_propietario");

  return (
    <form onSubmit={alEnviar} className="formulario-ancho" noValidate>
      {estado.error && <p className="aviso-error" role="alert">{t(estado.error)}</p>}
      <input type="hidden" name="propietarioId" value={propietario.id} />

      <SeccionFormulario icono="cuentas" titulo={t("cuentas.seccion_movimiento")}>
        <p className="muted">{t("cuentas.de_propietario", { nombre: propietario.nombre })}</p>
        <div className="fila fila-2">
          <div className="campo">
            <label htmlFor="tipo">{t("cuentas.col_tipo")}</label>
            <CampoIcono icono="contratos">
              <select id="tipo" name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                {TIPOS_MOVIMIENTO_MANUAL.map((x) => (
                  <option key={x} value={x}>{t(`cuentas.tipo_${x}`)}</option>
                ))}
              </select>
            </CampoIcono>
            <span className="muted">{t(`cuentas.efecto_${tipo}`)}</span>
          </div>
          {tipo === "ajuste_manual" ? (
            <div className="campo">
              <label htmlFor="ajuste">{t("cuentas.ajuste_sentido")}</label>
              <CampoIcono icono="traspaso">
                <select id="ajuste" name="ajuste" defaultValue="debe">
                  <option value="debe">{t("cuentas.ajuste_debe")}</option>
                  <option value="haber">{t("cuentas.ajuste_haber")}</option>
                </select>
              </CampoIcono>
            </div>
          ) : (
            <div />
          )}
        </div>
        <CampoBien bienes={bienes} conSelector={tipo === "gasto_extraordinario" || tipo === "ajuste_manual"} error={error("bienId")} invalido={Boolean(estado.errores?.bienId)} />
        <div className="campo">
          <label htmlFor="moneda">{t("obligaciones.campo_moneda")}</label>
          <CampoIcono icono="dinero">
            <select id="moneda" name="moneda" defaultValue={monedaInicial}>
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
            </select>
          </CampoIcono>
        </div>
        <div className="fila fila-2">
          <div className="campo">
            <label htmlFor="fecha">{t("pagos.campo_fecha")}</label>
            <CampoIcono icono="calendario">
              <input id="fecha" name="fecha" type="date" defaultValue={hoy} aria-invalid={Boolean(estado.errores?.fecha)} />
            </CampoIcono>
            {error("fecha")}
          </div>
          <div className="campo">
            <label htmlFor="importe">{t("cuentas.importe")}</label>
            <CampoIcono icono="dinero">
              <input id="importe" name="importe" type="text" inputMode="decimal" aria-invalid={Boolean(estado.errores?.importe)} />
            </CampoIcono>
            {error("importe")}
          </div>
        </div>
        <div className="campo">
          <label htmlFor="descripcion">{t("obligaciones.campo_descripcion")}</label>
          <CampoIcono icono="nota">
            <input id="descripcion" name="descripcion" type="text" placeholder={t("cuentas.placeholder_descripcion")} aria-invalid={Boolean(estado.errores?.descripcion)} />
          </CampoIcono>
          {error("descripcion")}
        </div>
      </SeccionFormulario>

      <SeccionFormulario icono="documento" titulo={t("cuentas.seccion_comprobante")}>
        <CampoAdjuntos organizacionId={organizacionId} entidad="movimiento" entidadId={movimientoId} tipo="comprobante" existentes={[]} etiqueta={t("pagos.campo_comprobante")} />
      </SeccionFormulario>

      {estado.avisoExceso && <AvisoExceso saldo={estado.avisoExceso} etiqueta={t("cuentas.confirmar_exceso")} />}

      <AccionesFormulario cancelarHref={cancelarHref} pendiente={enviando} />
    </form>
  );
}

type CampoCambio = "cotizacion" | "montoPesos" | "montoDolares";

// Centavos a texto es-AR editable: 12505000 → "125050"; 10050 → "100,5".
const centavosATexto = (centavos: number) => {
  const [enteros, decimales] = (centavos / 100).toFixed(2).split(".") as [string, string];
  return decimales === "00" ? enteros : `${enteros},${decimales.endsWith("0") ? decimales.slice(0, 1) : decimales}`;
};
const cotizacionATexto = (n: number) => n.toFixed(6).replace(".", ",").replace(/0+$/, "").replace(/,$/, "");

// MOV-04 Traspaso entre pesos y dólares: cotización, monto en pesos y monto en dólares. Alcanza con dos:
// el tercero se calcula solo. Se calcula el que se tocó hace más tiempo; si se escribe en el calculado,
// pasa a ser un dato y se recalcula otro.
export function FormularioTraspaso({ accion, propietario, bienes, hoy, cancelarHref, monedaInicial }: Comun & { monedaInicial: Moneda }) {
  const { estado, enviando, error, alEnviar } = useFormularioMovimiento(accion);
  const [origen, setOrigen] = useState<Moneda>(monedaInicial);
  const [escritos, setEscritos] = useState<Record<CampoCambio, string>>({ cotizacion: "", montoPesos: "", montoDolares: "" });
  const [tocados, setTocados] = useState<CampoCambio[]>([]);

  function cambiar(campo: CampoCambio, valor: string) {
    setEscritos((e) => ({ ...e, [campo]: valor }));
    setTocados((t) => {
      const sin = t.filter((x) => x !== campo);
      return valor.trim() === "" ? sin : [...sin, campo];
    });
  }

  // El campo calculado es el que no está entre los dos últimos tocados.
  const datos = tocados.slice(-2);
  const calculado: CampoCambio | null =
    datos.length === 2 ? (["cotizacion", "montoPesos", "montoDolares"] as const).find((c) => !datos.includes(c)) ?? null : null;
  let textoCalculado = "";
  if (calculado) {
    const leer = (c: CampoCambio) => escritos[c];
    const r = completarTraspaso({
      cotizacion: datos.includes("cotizacion") ? parsearCotizacion(leer("cotizacion")) : null,
      pesos: datos.includes("montoPesos") ? aCentavos(leer("montoPesos")) : null,
      dolares: datos.includes("montoDolares") ? aCentavos(leer("montoDolares")) : null,
    });
    if (r) textoCalculado = calculado === "cotizacion" ? cotizacionATexto(r.cotizacion) : centavosATexto(calculado === "montoPesos" ? r.pesos : r.dolares);
  }
  const valorDe = (c: CampoCambio) => (c === calculado ? textoCalculado : escritos[c]);

  const campo = (c: CampoCambio, etiqueta: string) => (
    <div className="campo">
      <label htmlFor={c}>{etiqueta}</label>
      <input
        id={c}
        name={c}
        type="text"
        inputMode="decimal"
        value={valorDe(c)}
        onChange={(e) => cambiar(c, e.target.value)}
        className={c === calculado ? "campo-calculado" : undefined}
        aria-invalid={Boolean(estado.errores?.[c])}
      />
      {c === calculado && <span className="muted">{t("cuentas.calculado")}</span>}
      {error(c)}
    </div>
  );

  return (
    <form onSubmit={alEnviar} className="formulario-ancho" noValidate>
      {estado.error && <p className="aviso-error" role="alert">{t(estado.error)}</p>}
      <input type="hidden" name="propietarioId" value={propietario.id} />

      <SeccionFormulario icono="traspaso" titulo={t("cuentas.seccion_traspaso")}>
        <p className="muted">{t("cuentas.de_propietario", { nombre: propietario.nombre })}</p>
        <div className="campo">
          <label htmlFor="monedaOrigen">{t("cuentas.sale_de")}</label>
          <CampoIcono icono="dinero">
            <select id="monedaOrigen" name="monedaOrigen" value={origen} onChange={(e) => setOrigen(e.target.value as Moneda)}>
              <option value="ARS">{t("cuentas.pesos")}</option>
              <option value="USD">{t("cuentas.dolares")}</option>
            </select>
          </CampoIcono>
        </div>
        <CampoBien bienes={bienes} conSelector={false} error={error("bienId")} invalido={Boolean(estado.errores?.bienId)} />
        <p className="muted">{t("cuentas.ayuda_traspaso")}</p>
        <div className="fila fila-3">
          {campo("montoPesos", t("cuentas.monto_pesos"))}
          {campo("cotizacion", t("cuentas.cotizacion"))}
          {campo("montoDolares", t("cuentas.monto_dolares"))}
        </div>
        <div className="fila fila-2">
          <div className="campo">
            <label htmlFor="fecha">{t("pagos.campo_fecha")}</label>
            <CampoIcono icono="calendario">
              <input id="fecha" name="fecha" type="date" defaultValue={hoy} aria-invalid={Boolean(estado.errores?.fecha)} />
            </CampoIcono>
            {error("fecha")}
          </div>
          <div className="campo">
            <label htmlFor="descripcion">{t("cuentas.nota_opcional")}</label>
            <CampoIcono icono="nota">
              <input id="descripcion" name="descripcion" type="text" />
            </CampoIcono>
          </div>
        </div>
      </SeccionFormulario>

      {estado.avisoExceso && <AvisoExceso saldo={estado.avisoExceso} etiqueta={t("cuentas.confirmar_exceso")} />}

      <AccionesFormulario cancelarHref={cancelarHref} pendiente={enviando} guardarTexto={t("cuentas.registrar_traspaso")} />
    </form>
  );
}
