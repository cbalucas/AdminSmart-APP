"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { t } from "@ai/i18n";
import { CampoIcono } from "@/components/ElementosFormulario";
import { Icono } from "@/components/Iconos";
import { completarPlantilla, VARIABLES_POR_DOCUMENTO, type CanalPlantilla, type DocumentoPlantilla } from "@ai/domain";
import { guardarPlantilla, restaurarPlantilla, type EstadoPlantilla } from "@/app/(gestion)/configuracion/plantillas/acciones";

// P-49 Editor de una plantilla: datos para insertar, vista previa con datos de ejemplo, restaurar y guardar.
export function EditorPlantilla({
  documento,
  canal,
  asuntoInicial,
  cuerpoInicial,
  original,
  personalizada,
  ejemplo,
}: {
  documento: DocumentoPlantilla;
  canal: CanalPlantilla;
  asuntoInicial: string;
  cuerpoInicial: string;
  original: { asunto: string; cuerpo: string };
  personalizada: boolean;
  ejemplo: Record<string, string>;
}) {
  const router = useRouter();
  const [asunto, setAsunto] = useState(asuntoInicial);
  const [cuerpo, setCuerpo] = useState(cuerpoInicial);
  const [estado, setEstado] = useState<EstadoPlantilla>({});
  const [pendiente, iniciar] = useTransition();
  const areaCuerpo = useRef<HTMLTextAreaElement>(null);
  const campoAsunto = useRef<HTMLInputElement>(null);
  const [activo, setActivo] = useState<"asunto" | "cuerpo">("cuerpo");

  const variables = VARIABLES_POR_DOCUMENTO[documento];
  const esEmail = canal === "email";
  const igualAlOriginal = asunto === original.asunto && cuerpo === original.cuerpo;

  // Inserta el dato donde está el cursor del campo que se estaba editando.
  function insertar(variable: string) {
    const texto = `{${variable}}`;
    if (activo === "asunto" && esEmail && campoAsunto.current) {
      const el = campoAsunto.current;
      const ini = el.selectionStart ?? asunto.length;
      const fin = el.selectionEnd ?? ini;
      setAsunto(asunto.slice(0, ini) + texto + asunto.slice(fin));
      requestAnimationFrame(() => { el.focus(); el.setSelectionRange(ini + texto.length, ini + texto.length); });
      return;
    }
    const el = areaCuerpo.current;
    const ini = el?.selectionStart ?? cuerpo.length;
    const fin = el?.selectionEnd ?? ini;
    setCuerpo(cuerpo.slice(0, ini) + texto + cuerpo.slice(fin));
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(ini + texto.length, ini + texto.length); });
  }

  function guardar() {
    setEstado({});
    iniciar(async () => {
      const r = await guardarPlantilla(documento, canal, asunto, cuerpo);
      setEstado(r);
      if (r.guardado) router.refresh();
    });
  }

  function restaurar() {
    setEstado({});
    iniciar(async () => {
      const r = await restaurarPlantilla(documento, canal);
      setEstado(r);
      if (r.restaurado) {
        setAsunto(original.asunto);
        setCuerpo(original.cuerpo);
        router.refresh();
      }
    });
  }

  return (
    <div className="editor-plantilla">
      {estado.error && (
        <p className="aviso-error" role="alert">
          {t(estado.error, { datos: (estado.desconocidas ?? []).map((v) => `{${v}}`).join(", ") })}
        </p>
      )}
      {estado.guardado && <p className="aviso-ok" role="status">{t("plantillas.guardado")}</p>}
      {estado.restaurado && <p className="aviso-ok" role="status">{t("plantillas.restaurado")}</p>}

      {documento === "resumen_deposito" && (
        <p className="aviso-advertencia" role="note">{t("plantillas.leyenda_numero", { numero: "{numero}" })}</p>
      )}

      <div className="editor-columnas">
        <div className="editor-edicion">
          {esEmail && (
            <div className="campo">
              <label htmlFor="asunto">{t("plantillas.asunto")}</label>
              <CampoIcono icono="mail">
                <input id="asunto" ref={campoAsunto} type="text" value={asunto} onChange={(e) => setAsunto(e.target.value)} onFocus={() => setActivo("asunto")} />
              </CampoIcono>
            </div>
          )}
          <div className="campo">
            <label htmlFor="cuerpo">{t("plantillas.cuerpo")}</label>
            <textarea id="cuerpo" ref={areaCuerpo} rows={canal === "email" ? 14 : 8} value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} onFocus={() => setActivo("cuerpo")} />
          </div>

          <div className="campo">
            <span className="etiqueta-lista">{t("plantillas.datos_disponibles")}</span>
            <ul className="variables">
              {variables.map((v) => (
                <li key={v}>
                  <button type="button" className="variable" onClick={() => insertar(v)}>{`{${v}}`}</button>
                  <span className="muted">{t(`plantillas.variable_${v}`)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="acciones">
            <button type="button" className="boton boton-secundario boton-con-icono" onClick={restaurar} disabled={pendiente || (!personalizada && igualAlOriginal)}>
              <Icono nombre="anular" tamano={18} />
              {t("plantillas.restaurar")}
            </button>
            <button type="button" className="boton boton-con-icono" onClick={guardar} disabled={pendiente || igualAlOriginal && !personalizada}>
              <Icono nombre="guardar" tamano={18} />
              {t("app.guardar")}
            </button>
          </div>
          {!personalizada && igualAlOriginal && <p className="muted">{t("plantillas.sin_cambios")}</p>}
        </div>

        <aside className="editor-vista">
          <span className="etiqueta-lista">{t("plantillas.vista_previa")}</span>
          <div className="vista-previa">
            {esEmail && <p className="vista-asunto">{completarPlantilla(asunto, ejemplo)}</p>}
            <p className="vista-cuerpo">{completarPlantilla(cuerpo, ejemplo)}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
