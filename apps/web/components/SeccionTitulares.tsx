"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { t } from "@ai/i18n";
import { estadoTitularidad, MODOS_LIQUIDACION, porcentajeDisponible, type ModoLiquidacion } from "@ai/domain";
import {
  agregarTitular,
  cambiarModoLiquidacion,
  cambiarPorcentaje,
  marcarRepresentante,
  quitarTitular,
  type ResultadoTitulares,
} from "@/app/(gestion)/bienes/[id]/acciones";
import type { Titular } from "@/lib/bienes";

const aTexto = (p: number) => String(p).replace(".", ",");
const aNumero = (s: string) => Number(s.trim().replace(",", "."));

// P-18 Titulares y reparto, dentro de la ficha del bien. Solo el administrador los modifica.
export function SeccionTitulares({
  bienId,
  titulares,
  candidatos,
  modo,
  propietarioLiquidacionId,
  puedeEditar,
}: {
  bienId: string;
  titulares: Titular[];
  candidatos: { id: string; nombre: string }[];
  modo: string;
  propietarioLiquidacionId: string | null;
  puedeEditar: boolean;
}) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [nuevoId, setNuevoId] = useState("");
  const [nuevoPorcentaje, setNuevoPorcentaje] = useState("");
  const [borradores, setBorradores] = useState<Record<string, string>>({});
  const [modoElegido, setModoElegido] = useState<ModoLiquidacion>(modo as ModoLiquidacion);
  const [propietarioElegido, setPropietarioElegido] = useState(propietarioLiquidacionId ?? titulares[0]?.propietarioId ?? "");
  const modoCambio =
    modoElegido !== modo || (modoElegido === "a_propietario" && propietarioElegido !== (propietarioLiquidacionId ?? ""));

  const porcentajes = titulares.map((x) => x.porcentaje);
  const estado = estadoTitularidad(porcentajes);
  const suma = Math.round(porcentajes.reduce((a, b) => a + b, 0) * 10000) / 10000;
  const resto = porcentajeDisponible(porcentajes);

  function ejecutar(accion: () => Promise<ResultadoTitulares>, despues?: () => void) {
    iniciar(async () => {
      const r = await accion();
      setError(r.error ?? null);
      if (!r.error) {
        despues?.();
        router.refresh();
      }
    });
  }

  function guardarPorcentaje(x: Titular) {
    const texto = borradores[x.vinculoId];
    if (texto === undefined || aNumero(texto) === x.porcentaje) return;
    ejecutar(
      () => cambiarPorcentaje(bienId, x.vinculoId, aNumero(texto)),
      () => setBorradores(({ [x.vinculoId]: _quitado, ...otros }) => otros),
    );
  }

  return (
    <section className="panel">
      <div className="encabezado">
        <h2>{t("bienes.titulares")}</h2>
      </div>

      {titulares.length === 0 ? (
        <p className="muted">{t("bienes.titulares_vacio")}</p>
      ) : (
        <div className="tabla-envoltorio">
          <table className="tabla">
            <thead>
              <tr>
                <th>{t("bienes.campo_titular")}</th>
                <th className="num">{t("bienes.col_porcentaje")}</th>
                <th>{t("titulares.col_representante")}</th>
                {puedeEditar && <th />}
              </tr>
            </thead>
            <tbody>
              {titulares.map((x) => (
                <tr key={x.vinculoId}>
                  <td>
                    <Link href={`/propietarios/${x.propietarioId}`}><strong>{x.nombre}</strong></Link>
                  </td>
                  <td className="num">
                    {puedeEditar ? (
                      <span className="porcentaje-editable">
                        <input
                          type="text"
                          inputMode="decimal"
                          aria-label={`${t("bienes.col_porcentaje")} ${x.nombre}`}
                          value={borradores[x.vinculoId] ?? aTexto(x.porcentaje)}
                          onChange={(e) => setBorradores({ ...borradores, [x.vinculoId]: e.target.value })}
                          onBlur={() => guardarPorcentaje(x)}
                          onKeyDown={(e) => e.key === "Enter" && (e.currentTarget.blur(), e.preventDefault())}
                          disabled={pendiente}
                        />
                        %
                      </span>
                    ) : (
                      `${aTexto(x.porcentaje)} %`
                    )}
                  </td>
                  <td>
                    {puedeEditar ? (
                      <input
                        type="radio"
                        name="representante"
                        checked={x.esRepresentante}
                        onChange={() => ejecutar(() => marcarRepresentante(bienId, x.vinculoId))}
                        aria-label={`${t("titulares.marcar_representante")}: ${x.nombre}`}
                        disabled={pendiente}
                      />
                    ) : (
                      x.esRepresentante && titulares.length > 1 && t("bienes.titular_representante")
                    )}
                  </td>
                  {puedeEditar && (
                    <td className="num">
                      {titulares.length > 1 && (
                        <button
                          type="button"
                          className="boton-texto"
                          disabled={pendiente}
                          onClick={() => window.confirm(t("titulares.quitar_confirmar")) && ejecutar(() => quitarTitular(bienId, x.vinculoId))}
                        >
                          {t("titulares.quitar")}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {titulares.length > 0 && (
        <p className={estado === "excedida" ? "error-campo" : "muted"}>
          {t("bienes.titulares_suma", { suma: aTexto(suma) })}
          {estado === "parcial" && ` · ${t("bienes.titulares_sin_cargar", { resto: aTexto(resto) })}`}
          {estado === "excedida" && ` · ${t("bienes.titularidad_excedida")}`}
        </p>
      )}

      {puedeEditar ? (
        <>
          {resto <= 0 ? (
            <p className="muted">{t("titulares.completo")}</p>
          ) : candidatos.length > 0 ? (
            <div className="agregar-titular">
              <p className="etiqueta-lista">{t("titulares.agregar")}</p>
              <div className="fila-lista">
                <select value={nuevoId} onChange={(e) => setNuevoId(e.target.value)} aria-label={t("bienes.campo_titular")} style={{ flex: 1, width: "auto" }}>
                  <option value="">{t("titulares.elegir")}</option>
                  {candidatos.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
                <input
                  type="text"
                  inputMode="decimal"
                  value={nuevoPorcentaje}
                  onChange={(e) => setNuevoPorcentaje(e.target.value)}
                  placeholder={t("titulares.disponible", { resto: aTexto(resto) })}
                  aria-label={t("bienes.campo_porcentaje")}
                  style={{ width: 170 }}
                />
                <button
                  type="button"
                  className="boton boton-secundario"
                  disabled={pendiente || !nuevoId}
                  onClick={() =>
                    ejecutar(
                      () => agregarTitular(bienId, nuevoId, aNumero(nuevoPorcentaje || String(resto))),
                      () => {
                        setNuevoId("");
                        setNuevoPorcentaje("");
                      },
                    )
                  }
                >
                  {t("titulares.agregar")}
                </button>
              </div>
            </div>
          ) : (
            <p className="muted">{t("titulares.sin_candidatos")}</p>
          )}

          <div className="campo modo-liquidacion">
            <label htmlFor="modo">{t("titulares.modo")}</label>
            <select id="modo" value={modoElegido} disabled={pendiente} onChange={(e) => setModoElegido(e.target.value as ModoLiquidacion)}>
              {MODOS_LIQUIDACION.map((m) => (
                <option key={m} value={m}>{t(`titulares.modo_${m}`)}</option>
              ))}
            </select>
            {modoElegido === "a_propietario" && (
              <>
                <label htmlFor="propietario-liquidacion">{t("titulares.elegir_liquidacion")}</label>
                <select
                  id="propietario-liquidacion"
                  value={propietarioElegido}
                  disabled={pendiente}
                  onChange={(e) => setPropietarioElegido(e.target.value)}
                >
                  {titulares.map((x) => (
                    <option key={x.propietarioId} value={x.propietarioId}>{x.nombre}</option>
                  ))}
                </select>
              </>
            )}
            <span className="muted">{t("titulares.modo_ayuda")}</span>
            {modoCambio && (
              <button
                type="button"
                className="boton boton-secundario"
                disabled={pendiente}
                onClick={() => ejecutar(() => cambiarModoLiquidacion(bienId, modoElegido, modoElegido === "a_propietario" ? propietarioElegido : null))}
              >
                {t("titulares.guardar_modo")}
              </button>
            )}
          </div>
        </>
      ) : (
        <p className="muted">{t("titulares.solo_administrador")}</p>
      )}

      {error && <p className="error-campo" role="alert">{t(error)}</p>}
    </section>
  );
}
