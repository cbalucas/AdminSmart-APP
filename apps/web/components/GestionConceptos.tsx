"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { t } from "@ai/i18n";
import { CATEGORIAS_CONCEPTO } from "@ai/domain";
import {
  actualizarConcepto,
  cambiarEstadoConcepto,
  crearConcepto,
  type ResultadoConcepto,
} from "@/app/(gestion)/configuracion/conceptos/acciones";

export interface ConceptoFila {
  id: string;
  nombre: string;
  categoria: string;
  estado: string;
  usos: number;
}

// P-42 Catálogo de conceptos: se edita en la propia tabla; nada se elimina, solo se desactiva.
export function GestionConceptos({ conceptos }: { conceptos: ConceptoFila[] }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [cambios, setCambios] = useState<Record<string, { nombre: string; categoria: string }>>({});
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevaCategoria, setNuevaCategoria] = useState("servicio");

  function ejecutar(accion: () => Promise<ResultadoConcepto>, despues?: () => void) {
    iniciar(async () => {
      const r = await accion();
      setError(r.error ?? null);
      if (!r.error) {
        despues?.();
        router.refresh();
      }
    });
  }

  const valor = (c: ConceptoFila) => cambios[c.id] ?? { nombre: c.nombre, categoria: c.categoria };
  const modificado = (c: ConceptoFila) => cambios[c.id] !== undefined && (cambios[c.id]!.nombre !== c.nombre || cambios[c.id]!.categoria !== c.categoria);

  return (
    <section className="panel">
      <p className="muted">{t("conceptos.ayuda")}</p>
      {conceptos.length === 0 ? (
        <p className="muted">{t("conceptos.vacio")}</p>
      ) : (
        <div className="tabla-envoltorio">
          <table className="tabla">
            <thead>
              <tr>
                <th>{t("conceptos.col_nombre")}</th>
                <th>{t("conceptos.col_categoria")}</th>
                <th className="num">{t("conceptos.col_usos")}</th>
                <th>{t("conceptos.col_estado")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {conceptos.map((c) => (
                <tr key={c.id}>
                  <td>
                    <input
                      className="celda-editable"
                      type="text"
                      value={valor(c).nombre}
                      aria-label={t("conceptos.col_nombre")}
                      onChange={(e) => setCambios({ ...cambios, [c.id]: { ...valor(c), nombre: e.target.value } })}
                    />
                  </td>
                  <td>
                    <select
                      className="celda-editable"
                      value={valor(c).categoria}
                      aria-label={t("conceptos.col_categoria")}
                      onChange={(e) => setCambios({ ...cambios, [c.id]: { ...valor(c), categoria: e.target.value } })}
                    >
                      {CATEGORIAS_CONCEPTO.map((cat) => (
                        <option key={cat} value={cat}>{t(`conceptos.categoria_${cat}`)}</option>
                      ))}
                    </select>
                  </td>
                  <td className="num">{c.usos}</td>
                  <td>
                    <span className={c.estado === "activo" ? "estado estado-ok" : "estado estado-neutro"}>
                      {t(c.estado === "activo" ? "conceptos.activo" : "conceptos.inactivo")}
                    </span>
                  </td>
                  <td>
                    <div className="acciones-fila">
                    {modificado(c) && (
                      <button
                        type="button"
                        className="boton boton-secundario"
                        disabled={pendiente}
                        onClick={() =>
                          ejecutar(
                            () => actualizarConcepto(c.id, valor(c).nombre, valor(c).categoria),
                            () => setCambios(({ [c.id]: _quitado, ...otros }) => otros),
                          )
                        }
                      >
                        {t("conceptos.guardar")}
                      </button>
                    )}
                    <button
                      type="button"
                      className="boton-texto"
                      disabled={pendiente}
                      onClick={() => ejecutar(() => cambiarEstadoConcepto(c.id, c.estado !== "activo"))}
                    >
                      {c.estado === "activo" ? t("conceptos.desactivar") : t("conceptos.activar")}
                    </button>
                  </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="agregar-titular">
        <p className="etiqueta-lista">{t("conceptos.nuevo")}</p>
        <div className="fila-lista">
          <input
            type="text"
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
            placeholder={t("conceptos.placeholder_nombre")}
            aria-label={t("conceptos.col_nombre")}
            style={{ flex: 1, width: "auto" }}
          />
          <select value={nuevaCategoria} onChange={(e) => setNuevaCategoria(e.target.value)} aria-label={t("conceptos.col_categoria")} style={{ width: 160 }}>
            {CATEGORIAS_CONCEPTO.map((cat) => (
              <option key={cat} value={cat}>{t(`conceptos.categoria_${cat}`)}</option>
            ))}
          </select>
          <button
            type="button"
            className="boton boton-secundario"
            disabled={pendiente || nuevoNombre.trim() === ""}
            onClick={() =>
              ejecutar(
                () => crearConcepto(nuevoNombre, nuevaCategoria),
                () => setNuevoNombre(""),
              )
            }
          >
            {t("conceptos.nuevo")}
          </button>
        </div>
      </div>

      {error && <p className="error-campo" role="alert">{t(error)}</p>}
    </section>
  );
}
