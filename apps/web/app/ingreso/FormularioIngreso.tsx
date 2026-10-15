"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { esquemaIngreso } from "@ai/domain";
import { t } from "@ai/i18n";
import { crearClienteNavegador } from "@/lib/supabase/navegador";

const CLAVE_EMAIL = "ai.email_recordado";

export function FormularioIngreso({ errorInicial }: { errorInicial?: string }) {
  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [verContrasena, setVerContrasena] = useState(false);
  const [recordar, setRecordar] = useState(true);
  const [errores, setErrores] = useState<{ email?: string; contrasena?: string }>({});
  const [mensaje, setMensaje] = useState<string | undefined>(errorInicial);
  const [enCurso, setEnCurso] = useState(false);

  // "Recordar mi email": se guarda solo el email, nunca la contraseña.
  useEffect(() => {
    try {
      const guardado = localStorage.getItem(CLAVE_EMAIL);
      if (guardado) setEmail(guardado);
    } catch {
      /* sin almacenamiento local: se ingresa a mano */
    }
  }, []);

  async function ingresar(evento: React.FormEvent) {
    evento.preventDefault();
    setMensaje(undefined);
    const validado = esquemaIngreso.safeParse({ email, contrasena });
    if (!validado.success) {
      const campos: { email?: string; contrasena?: string } = {};
      for (const problema of validado.error.issues) {
        const campo = problema.path[0] as "email" | "contrasena";
        campos[campo] ??= problema.message;
      }
      setErrores(campos);
      return;
    }
    setErrores({});
    setEnCurso(true);
    try {
      const supabase = crearClienteNavegador();
      const { error } = await supabase.auth.signInWithPassword({
        email: validado.data.email,
        password: validado.data.contrasena,
      });
      if (error) {
        const sinConexion = error.message.toLowerCase().includes("fetch") || error.status === 0;
        setMensaje(sinConexion ? "comun.error_red" : "ingreso.error_credenciales");
        return;
      }
      try {
        if (recordar) localStorage.setItem(CLAVE_EMAIL, validado.data.email);
        else localStorage.removeItem(CLAVE_EMAIL);
      } catch {
        /* sin almacenamiento local */
      }
      window.location.assign("/inicio");
    } catch {
      setMensaje("comun.error_red");
    } finally {
      setEnCurso(false);
    }
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
    <form className="formulario" onSubmit={ingresar} noValidate>
      <h2>{t("ingreso.titulo")}</h2>

      {mensaje && (
        <p className="aviso-error" role="alert">
          {t(mensaje)}
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
          aria-invalid={Boolean(errores.email)}
        />
        {errores.email && <span className="error-campo">{t(errores.email)}</span>}
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

      <p className="separador">{t("comun.o")}</p>

      <button type="button" className="boton boton-secundario" onClick={ingresarConGoogle}>
        {t("ingreso.google")}
      </button>

      <p className="enlaces">
        <Link href="/recuperar">{t("ingreso.olvide")}</Link>
      </p>
    </form>
  );
}
