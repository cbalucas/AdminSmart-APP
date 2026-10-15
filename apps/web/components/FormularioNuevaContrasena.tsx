"use client";

import Link from "next/link";
import { useState } from "react";
import { esquemaNuevaContrasena } from "@ai/domain";
import { t } from "@ai/i18n";
import { crearClienteNavegador } from "@/lib/supabase/navegador";

// P-04 paso 3 (después del enlace del email) y P-46 Mi cuenta: cambio de contraseña.
export function FormularioNuevaContrasena() {
  const [contrasena, setContrasena] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [verContrasena, setVerContrasena] = useState(false);
  const [errores, setErrores] = useState<{ contrasena?: string; confirmacion?: string }>({});
  const [mensajeError, setMensajeError] = useState<string>();
  const [guardada, setGuardada] = useState(false);
  const [enCurso, setEnCurso] = useState(false);

  async function guardar(evento: React.FormEvent) {
    evento.preventDefault();
    setMensajeError(undefined);
    const validado = esquemaNuevaContrasena.safeParse({ contrasena, confirmacion });
    if (!validado.success) {
      const campos: { contrasena?: string; confirmacion?: string } = {};
      for (const problema of validado.error.issues) {
        const campo = problema.path[0] as "contrasena" | "confirmacion";
        campos[campo] ??= problema.message;
      }
      setErrores(campos);
      return;
    }
    setErrores({});
    setEnCurso(true);
    try {
      const supabase = crearClienteNavegador();
      const { error } = await supabase.auth.updateUser({ password: validado.data.contrasena });
      if (error) setMensajeError("nueva_contrasena.error");
      else setGuardada(true);
    } catch {
      setMensajeError("comun.error_red");
    } finally {
      setEnCurso(false);
    }
  }

  if (guardada) {
    return (
      <div className="grupo-formulario">
        <p className="aviso-ok" role="status">
          {t("nueva_contrasena.guardada")}
        </p>
        <Link className="boton" href="/inicio">
          {t("nueva_contrasena.ir_inicio")}
        </Link>
      </div>
    );
  }

  return (
    <form className="grupo-formulario" onSubmit={guardar} noValidate>
      <p className="muted">{t("nueva_contrasena.texto")}</p>
      {mensajeError && (
        <p className="aviso-error" role="alert">
          {t(mensajeError)}
        </p>
      )}

      <div className="campo">
        <label htmlFor="contrasena">{t("nueva_contrasena.contrasena")}</label>
        <div className="con-boton">
          <input
            id="contrasena"
            type={verContrasena ? "text" : "password"}
            autoComplete="new-password"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            aria-invalid={Boolean(errores.contrasena)}
          />
          <button type="button" className="boton-texto" onClick={() => setVerContrasena((v) => !v)}>
            {t(verContrasena ? "comun.ocultar" : "comun.mostrar")}
          </button>
        </div>
        {errores.contrasena && <span className="error-campo">{t(errores.contrasena)}</span>}
      </div>

      <div className="campo">
        <label htmlFor="confirmacion">{t("nueva_contrasena.confirmacion")}</label>
        <input
          id="confirmacion"
          type={verContrasena ? "text" : "password"}
          autoComplete="new-password"
          value={confirmacion}
          onChange={(e) => setConfirmacion(e.target.value)}
          aria-invalid={Boolean(errores.confirmacion)}
        />
        {errores.confirmacion && <span className="error-campo">{t(errores.confirmacion)}</span>}
      </div>

      <button type="submit" className="boton" disabled={enCurso}>
        {t(enCurso ? "nueva_contrasena.guardando" : "nueva_contrasena.guardar")}
      </button>
    </form>
  );
}
