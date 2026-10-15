"use client";

import Link from "next/link";
import { useState } from "react";
import { esquemaRecuperacion } from "@ai/domain";
import { t } from "@ai/i18n";
import { crearClienteNavegador } from "@/lib/supabase/navegador";

export function FormularioRecuperar() {
  const [email, setEmail] = useState("");
  const [errorEmail, setErrorEmail] = useState<string>();
  const [mensajeError, setMensajeError] = useState<string>();
  const [enviado, setEnviado] = useState(false);
  const [enCurso, setEnCurso] = useState(false);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setMensajeError(undefined);
    const validado = esquemaRecuperacion.safeParse({ email });
    if (!validado.success) {
      setErrorEmail(validado.error.issues[0]?.message);
      return;
    }
    setErrorEmail(undefined);
    setEnCurso(true);
    try {
      const supabase = crearClienteNavegador();
      const { error } = await supabase.auth.resetPasswordForEmail(validado.data.email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/recuperar/nueva`,
      });
      // Por seguridad no se revela si el email existe: el mensaje es el mismo.
      if (error && (error.status === 0 || error.message.toLowerCase().includes("fetch"))) {
        setMensajeError("comun.error_red");
      } else {
        setEnviado(true);
      }
    } catch {
      setMensajeError("comun.error_red");
    } finally {
      setEnCurso(false);
    }
  }

  return (
    <form className="formulario" onSubmit={enviar} noValidate>
      <h2>{t("recuperar.titulo")}</h2>

      {enviado ? (
        <p className="aviso-ok" role="status">
          {t("recuperar.enviado")}
        </p>
      ) : (
        <>
          <p className="muted">{t("recuperar.texto")}</p>
          {mensajeError && (
            <p className="aviso-error" role="alert">
              {t(mensajeError)}
            </p>
          )}
          <div className="campo">
            <label htmlFor="email">{t("ingreso.email")}</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(errorEmail)}
            />
            {errorEmail && <span className="error-campo">{t(errorEmail)}</span>}
          </div>
          <button type="submit" className="boton" disabled={enCurso}>
            {t(enCurso ? "recuperar.enviando" : "recuperar.enviar")}
          </button>
        </>
      )}

      <p className="enlaces">
        <Link href="/ingreso">{t("comun.volver_ingreso")}</Link>
      </p>
    </form>
  );
}
