"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { t } from "@ai/i18n";
import { AccionIcono } from "@/components/AccionIcono";
import {
  desactivarPropietario,
  reactivarPropietario,
  type ResultadoCambioEstado,
} from "@/app/(gestion)/propietarios/acciones";

// Desactivar (PRO-02) o reactivar un propietario. Si no se puede, explica por qué.
export function BotonEstadoPropietario({ id, activo }: { id: string; activo: boolean }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [resultado, setResultado] = useState<ResultadoCambioEstado>({});

  function cambiar() {
    if (activo && !window.confirm(t("propietarios.desactivar_confirmar"))) return;
    iniciar(async () => {
      const r = activo ? await desactivarPropietario(id) : await reactivarPropietario(id);
      setResultado(r);
      if (!r.impedimentos && !r.error) router.refresh();
    });
  }

  return (
    <div className="estado-propietario">
      <AccionIcono icono={activo ? "desactivar" : "reactivar"} titulo={activo ? t("propietarios.desactivar") : t("propietarios.reactivar")} onClick={cambiar} disabled={pendiente} tono={activo ? "secundario" : "primario"} />
      {resultado.impedimentos && (
        <div className="aviso-advertencia" role="alert">
          <p>{t("propietarios.no_se_puede_desactivar")}</p>
          <ul>
            {resultado.impedimentos.map((clave) => (
              <li key={clave}>{t(clave)}</li>
            ))}
          </ul>
        </div>
      )}
      {resultado.error && <p className="aviso-error" role="alert">{t(resultado.error)}</p>}
    </div>
  );
}
