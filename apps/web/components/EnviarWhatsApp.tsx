"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { t } from "@ai/i18n";
import { prepararEnvioWhatsApp, type ResultadoWhatsApp } from "@/app/(gestion)/propietarios/[id]/resumen-deposito/acciones";

// Envío del resumen por WhatsApp desde la web: el texto se puede corregir antes de enviar (la plantilla no cambia).
// Abre la conversación con el texto y descarga el PDF para adjuntarlo.
export function EnviarWhatsApp({
  propietarioId,
  h,
  fecha,
  textoInicial,
  telefono,
  motivoDeshabilitado,
}: {
  propietarioId: string;
  h: string;
  fecha: string;
  textoInicial: string;
  telefono: string | null;
  motivoDeshabilitado: string | null;
}) {
  const router = useRouter();
  const [texto, setTexto] = useState(textoInicial);
  const [pendiente, iniciar] = useTransition();
  const [resultado, setResultado] = useState<ResultadoWhatsApp | null>(null);

  function enviar() {
    // La ventana se abre en el clic (los navegadores bloquean las que se abren después de esperar al servidor).
    const ventana = window.open("about:blank", "_blank");
    setResultado(null);
    iniciar(async () => {
      const r = await prepararEnvioWhatsApp(propietarioId, h, fecha, texto);
      setResultado(r);
      if (r.error || !r.url) {
        ventana?.close();
        return;
      }
      if (ventana) ventana.location.href = r.url;
      if (r.pdfUrl) {
        const descarga = document.createElement("a");
        descarga.href = r.pdfUrl;
        descarga.download = "";
        document.body.appendChild(descarga);
        descarga.click();
        descarga.remove();
      }
      router.refresh();
    });
  }

  return (
    <div className="enviar-whatsapp">
      <div className="campo">
        <label htmlFor="texto-whatsapp">{t("resumen.mensaje_whatsapp")}</label>
        <textarea id="texto-whatsapp" rows={6} value={texto} onChange={(e) => setTexto(e.target.value)} disabled={Boolean(motivoDeshabilitado)} />
        <span className="muted">{telefono ? t("resumen.se_envia_a", { telefono }) : ""}</span>
        {texto.includes("{numero}") && <span className="muted">{t("resumen.leyenda_numero")}</span>}
      </div>
      <div className="acciones-fila">
        <button type="button" className="boton" disabled={pendiente || Boolean(motivoDeshabilitado)} onClick={enviar} title={motivoDeshabilitado ?? undefined}>
          {pendiente ? t("resumen.preparando") : t("resumen.enviar_whatsapp")}
        </button>
        <button type="button" className="boton-texto" onClick={() => setTexto(textoInicial)} disabled={texto === textoInicial}>
          {t("resumen.restaurar_texto")}
        </button>
      </div>
      {motivoDeshabilitado && <p className="aviso-advertencia">{motivoDeshabilitado}</p>}
      {resultado?.error && <p className="aviso-error" role="alert">{t(resultado.error)}</p>}
      {resultado?.url && (
        <p className="aviso-ok" role="status">
          {t("resumen.whatsapp_listo", { numero: resultado.numero ?? "" })}{" "}
          <a href={resultado.url} target="_blank" rel="noreferrer">{t("resumen.abrir_whatsapp")}</a>
        </p>
      )}
    </div>
  );
}
