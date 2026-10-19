"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { t } from "@ai/i18n";
import { ESTADOS_POR_TIPO, type TipoBien } from "@ai/domain";
import { cambiarEstadoBien, type ResultadoTitulares } from "@/app/(gestion)/bienes/[id]/acciones";

// Cambio manual del estado del bien (PROP-02). Vendido pide confirmación y exige PROP-03.
export function CambiarEstadoBien({ bienId, tipo, estado }: { bienId: string; tipo: TipoBien; estado: string }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [resultado, setResultado] = useState<ResultadoTitulares>({});

  function cambiar(nuevo: string) {
    if (nuevo === estado) return;
    if (nuevo === "vendido" && !window.confirm(t("estado.vendido_confirmar"))) return;
    iniciar(async () => {
      const r = await cambiarEstadoBien(bienId, nuevo);
      setResultado(r);
      router.refresh();
    });
  }

  return (
    <div className="cambiar-estado">
      <label htmlFor="estado-bien" className="muted">{t("estado.titulo")}</label>
      <select id="estado-bien" value={estado} disabled={pendiente} onChange={(e) => cambiar(e.target.value)}>
        {ESTADOS_POR_TIPO[tipo].map((e) => (
          <option key={e} value={e}>{t(`estado_bien.${e}`)}</option>
        ))}
      </select>
      {resultado.impedimentos && (
        <div className="aviso-advertencia" role="alert">
          <p>{t("estado.no_se_puede_vender")}</p>
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
