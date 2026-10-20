"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { t } from "@ai/i18n";
import { AccionIcono } from "@/components/AccionIcono";
import {
  cambiarEstadoCuenta,
  desvincularCuenta,
  marcarPredeterminada,
  vincularCuentaExistente,
  type ResultadoCuenta,
} from "@/app/(gestion)/propietarios/[id]/cuentas/acciones";
import type { CuentaDelPropietario, CuentaDisponible } from "@/lib/cuentas";

// Botones de una cuenta dentro de la ficha del propietario (solo administrador).
export function AccionesCuenta({ propietarioId, cuenta }: { propietarioId: string; cuenta: CuentaDelPropietario }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const activa = cuenta.estado === "activo";

  function ejecutar(accion: () => Promise<ResultadoCuenta>, confirmar?: string) {
    if (confirmar && !window.confirm(confirmar)) return;
    iniciar(async () => {
      const r = await accion();
      setError(r.error ?? null);
      if (!r.error) router.refresh();
    });
  }

  return (
    <div className="acciones-cuenta">
      <AccionIcono href={`/propietarios/${propietarioId}/cuentas/${cuenta.cuentaId}/editar`} icono="editar" titulo={t("app.editar")} />
      {activa && !cuenta.predeterminada && (
        <AccionIcono icono="estrella" titulo={t("cuentas.marcar_predeterminada")} disabled={pendiente} onClick={() => ejecutar(() => marcarPredeterminada(propietarioId, cuenta.vinculoId))} />
      )}
      <AccionIcono
        icono={activa ? "desactivar" : "activar"}
        titulo={activa ? t("cuentas.desactivar") : t("cuentas.activar")}
        disabled={pendiente}
        onClick={() => ejecutar(() => cambiarEstadoCuenta(propietarioId, cuenta.cuentaId, !activa))}
      />
      <AccionIcono
        icono="desvincular"
        titulo={t("cuentas.desvincular")}
        tono="peligro"
        disabled={pendiente}
        onClick={() => ejecutar(() => desvincularCuenta(propietarioId, cuenta.vinculoId), t("cuentas.desvincular_confirmar"))}
      />
      {error && <span className="error-campo" role="alert">{t(error)}</span>}
    </div>
  );
}

// Vincula a este propietario una cuenta que ya existe (cuentas compartidas entre cotitulares).
export function VincularCuenta({ propietarioId, disponibles }: { propietarioId: string; disponibles: CuentaDisponible[] }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [elegida, setElegida] = useState("");
  const [error, setError] = useState<string | null>(null);
  if (disponibles.length === 0) return null;

  function vincular() {
    if (!elegida) return;
    iniciar(async () => {
      const r = await vincularCuentaExistente(propietarioId, elegida);
      setError(r.error ?? null);
      if (!r.error) {
        setElegida("");
        router.refresh();
      }
    });
  }

  return (
    <div className="vincular">
      <p className="etiqueta-lista">{t("cuentas.vincular_titulo")}</p>
      <p className="muted">{t("cuentas.vincular_ayuda")}</p>
      <div className="fila-lista">
        <select value={elegida} onChange={(e) => setElegida(e.target.value)} aria-label={t("cuentas.vincular_titulo")} style={{ width: "auto", flex: 1 }}>
          <option value="">{t("cuentas.vincular_elegir")}</option>
          {disponibles.map((c) => (
            <option key={c.id} value={c.id}>{c.etiqueta}</option>
          ))}
        </select>
        <button type="button" className="boton boton-secundario" onClick={vincular} disabled={pendiente || !elegida}>
          {t("cuentas.vincular")}
        </button>
      </div>
      {error && <span className="error-campo" role="alert">{t(error)}</span>}
    </div>
  );
}
