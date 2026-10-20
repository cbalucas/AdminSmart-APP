"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { t } from "@ai/i18n";
import { AccionIcono } from "@/components/AccionIcono";
import { formatearImporte } from "@ai/domain";
import { cambiarEstadoServicio } from "@/app/(gestion)/bienes/[id]/servicios/acciones";
import type { Servicio } from "@/lib/servicios";

// Pestaña "Servicios e impuestos" de la ficha del bien (P-16 / P-19).
export function SeccionServicios({ bienId, servicios }: { bienId: string; servicios: Servicio[] }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function cambiar(s: Servicio) {
    iniciar(async () => {
      const r = await cambiarEstadoServicio(bienId, s.id, s.estado !== "activo");
      setError(r.error ?? null);
      if (!r.error) router.refresh();
    });
  }

  return (
    <section className="panel">
      <div className="encabezado">
        <h2>{t("servicios.titulo")}</h2>
        <AccionIcono href={`/bienes/${bienId}/servicios/nuevo`} icono="mas" titulo={t("servicios.agregar")} tono="primario" />
      </div>

      {servicios.length === 0 ? (
        <p className="muted">{t("servicios.vacio")}</p>
      ) : (
        <div className="tabla-envoltorio">
          <table className="tabla">
            <thead>
              <tr>
                <th>{t("servicios.col_concepto")}</th>
                <th>{t("servicios.col_cuenta")}</th>
                <th>{t("servicios.col_empresa")}</th>
                <th>{t("servicios.col_periodicidad")}</th>
                <th>{t("servicios.col_responsable")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {servicios.map((s) => (
                <tr key={s.id} className={s.estado === "activo" ? undefined : "fila-inactiva"}>
                  <td>
                    <strong>{s.concepto}</strong>
                    {s.estado !== "activo" && <span className="estado estado-neutro">{t("servicios.inactivo")}</span>}
                    {s.titularServicio && <span className="linea muted">{s.titularServicio}</span>}
                  </td>
                  <td>
                    {s.nroCuentaCliente}
                    {s.debitoAutomatico && <span className="linea muted">{t("servicios.debito")}</span>}
                  </td>
                  <td>
                    {s.empresaPrestadora}
                    {s.sitioBoletas && (
                      <span className="linea">
                        <a href={s.sitioBoletas} target="_blank" rel="noreferrer">{t("servicios.ver_sitio")}</a>
                      </span>
                    )}
                  </td>
                  <td>
                    {s.periodicidad ? t(`propietarios.per_${s.periodicidad}`) : <span className="muted">—</span>}
                    {s.diaVencimiento !== null && <span className="muted"> · día {s.diaVencimiento}</span>}
                    {s.montoEstimado !== null && s.montoEstimadoMoneda && (
                      <span className="linea muted">{formatearImporte(s.montoEstimado, s.montoEstimadoMoneda)}</span>
                    )}
                  </td>
                  <td>{t(`servicios.responsable_${s.responsableDefault}`)}</td>
                  <td>
                    <div className="acciones-fila">
                      <AccionIcono href={`/bienes/${bienId}/servicios/${s.id}/editar`} icono="editar" titulo={t("app.editar")} />
                      <AccionIcono icono={s.estado === "activo" ? "desactivar" : "activar"} titulo={s.estado === "activo" ? t("servicios.desactivar") : t("servicios.activar")} disabled={pendiente} onClick={() => cambiar(s)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {error && <p className="error-campo" role="alert">{t(error)}</p>}
    </section>
  );
}
