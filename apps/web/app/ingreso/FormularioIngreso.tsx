"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { esquemaIngreso } from "@ai/domain";
import { t } from "@ai/i18n";
import { ingresarConIdentificador } from "@/lib/ingreso";
import { crearClienteNavegador } from "@/lib/supabase/navegador";

const CLAVE_EMAIL = "ai.email_recordado";

// Logo oficial de Google ("G" de cuatro colores).
function IconoGoogle() {
  return (
    <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 0 1 9.5 24c0-1.59.28-3.14.76-4.59l-7.98-6.19A23.99 23.99 0 0 0 0 24c0 3.77.9 7.35 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export function FormularioIngreso({ errorInicial }: { errorInicial?: string }) {
  const [identificador, setIdentificador] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [verContrasena, setVerContrasena] = useState(false);
  const [recordar, setRecordar] = useState(true);
  const [errores, setErrores] = useState<{ identificador?: string; contrasena?: string }>({});
  const [mensaje, setMensaje] = useState<string | undefined>(errorInicial);
  const [enCurso, setEnCurso] = useState(false);

  // "Recordar mi email": se guarda solo el email o usuario, nunca la contraseña.
  useEffect(() => {
    try {
      const guardado = localStorage.getItem(CLAVE_EMAIL);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- el almacenamiento local solo existe en el navegador
      if (guardado) setIdentificador(guardado);
    } catch {
      /* sin almacenamiento local: se ingresa a mano */
    }
  }, []);

  async function ingresar(evento: React.FormEvent) {
    evento.preventDefault();
    setMensaje(undefined);
    const validado = esquemaIngreso.safeParse({ identificador, contrasena });
    if (!validado.success) {
      const campos: { identificador?: string; contrasena?: string } = {};
      for (const problema of validado.error.issues) {
        const campo = problema.path[0] as "identificador" | "contrasena";
        campos[campo] ??= problema.message;
      }
      setErrores(campos);
      return;
    }
    setErrores({});
    setEnCurso(true);
    const resultado = await ingresarConIdentificador(validado.data.identificador, validado.data.contrasena);
    setEnCurso(false);
    if (resultado !== "ok") {
      setMensaje(resultado === "red" ? "comun.error_red" : "ingreso.error_credenciales");
      return;
    }
    try {
      if (recordar) localStorage.setItem(CLAVE_EMAIL, validado.data.identificador);
      else localStorage.removeItem(CLAVE_EMAIL);
    } catch {
      /* sin almacenamiento local */
    }
    // Recarga completa a propósito: el servidor tiene que leer la sesión recién creada.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/inicio");
  }

  async function ingresarConGoogle() {
    setMensaje(undefined);
    const supabase = crearClienteNavegador();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/inicio` },
    });
    if (error) setMensaje("ingreso.error_google");
  }

  return (
    <form className="formulario formulario-ingreso" onSubmit={ingresar} noValidate>
      <div className="ingreso-encabezado">
        <h2>{t("ingreso.titulo")}</h2>
        <p className="muted">{t("ingreso.subtitulo")}</p>
      </div>

      <button type="button" className="boton boton-google" onClick={ingresarConGoogle}>
        <IconoGoogle />
        {t("ingreso.google")}
      </button>

      <p className="separador">{t("comun.o")}</p>

      {mensaje && (
        <p className="aviso-error" role="alert">
          {t(mensaje)}
        </p>
      )}

      <div className="campo">
        <label htmlFor="identificador">{t("ingreso.identificador")}</label>
        <input
          id="identificador"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={identificador}
          onChange={(e) => setIdentificador(e.target.value)}
          aria-invalid={Boolean(errores.identificador)}
        />
        {errores.identificador && <span className="error-campo">{t(errores.identificador)}</span>}
      </div>

      <div className="campo">
        <label htmlFor="contrasena">{t("ingreso.contrasena")}</label>
        <div className="con-boton">
          <input
            id="contrasena"
            type={verContrasena ? "text" : "password"}
            autoComplete="current-password"
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

      <label className="casilla">
        <input type="checkbox" checked={recordar} onChange={(e) => setRecordar(e.target.checked)} />
        {t("ingreso.recordar_email")}
      </label>

      <button type="submit" className="boton" disabled={enCurso}>
        {t(enCurso ? "ingreso.ingresando" : "ingreso.boton")}
      </button>

      <p className="enlaces">
        <Link href="/recuperar">{t("ingreso.olvide")}</Link>
      </p>
    </form>
  );
}
