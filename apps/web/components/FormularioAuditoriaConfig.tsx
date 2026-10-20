"use client";

import { useActionState, useState, useTransition } from "react";
import { t } from "@ai/i18n";
import { AccionesFormulario, SeccionFormulario } from "@/components/ElementosFormulario";
import { guardarConfigAuditoria, type EstadoAuditoriaConfig } from "@/app/(gestion)/configuracion/auditoria/acciones";

// AUD-04: interruptor general y lista de propietarios.
export function FormularioAuditoriaConfig({ activa, propietarios }: { activa: boolean; propietarios: { id: string; nombre: string; auditar: boolean }[] }) {
  const [estado, enviar, enviando] = useActionState(guardarConfigAuditoria, {} as EstadoAuditoriaConfig);
  const [, iniciar] = useTransition();
  const [general, setGeneral] = useState(activa);
  const [marcados, setMarcados] = useState(() => new Set(propietarios.filter((p) => p.auditar).map((p) => p.id)));
  const alternar = (id: string) =>
    setMarcados((previo) => {
      const nuevo = new Set(previo);
      if (nuevo.has(id)) nuevo.delete(id);
      else nuevo.add(id);
      return nuevo;
    });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const datos = new FormData(e.currentTarget);
        iniciar(() => enviar(datos));
      }}
      className="formulario-ancho"
    >
      {estado.error && <p className="aviso-error" role="alert">{t(estado.error)}</p>}
      {estado.guardado && <p className="aviso-ok" role="status">{t("auditoria_config.guardado")}</p>}

      <SeccionFormulario icono="auditoria" titulo={t("auditoria_config.seccion_general")}>
        <label className="casilla casilla-grande">
          <input type="checkbox" name="auditoriaActiva" value="1" checked={general} onChange={(e) => setGeneral(e.target.checked)} />
          {t("auditoria_config.activar")}
        </label>
        <p className="muted">{t("auditoria_config.ayuda_general")}</p>
      </SeccionFormulario>

      <SeccionFormulario icono="propietarios" titulo={t("auditoria_config.seccion_propietarios")}>
        <p className="muted">{t("auditoria_config.ayuda_propietarios")}</p>
        {!general && <p className="aviso-advertencia" role="note">{t("auditoria_config.general_apagada")}</p>}
        {propietarios.length === 0 ? (
          <p className="muted">{t("auditoria_config.sin_propietarios")}</p>
        ) : (
          <>
            <div className="acciones-fila acciones-izquierda">
              <button type="button" className="boton-texto" onClick={() => setMarcados(new Set(propietarios.map((p) => p.id)))}>{t("auditoria_config.marcar_todos")}</button>
              <button type="button" className="boton-texto" onClick={() => setMarcados(new Set())}>{t("auditoria_config.desmarcar_todos")}</button>
            </div>
            <ul className="lista-marcas">
              {propietarios.map((p) => (
                <li key={p.id}>
                  <label className="casilla">
                    <input type="checkbox" name="auditar" value={p.id} checked={marcados.has(p.id)} onChange={() => alternar(p.id)} disabled={!general} />
                    {p.nombre}
                  </label>
                </li>
              ))}
            </ul>
          </>
        )}
      </SeccionFormulario>

      <AccionesFormulario pendiente={enviando} />
    </form>
  );
}
