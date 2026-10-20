"use client";

import { useEffect, useState } from "react";
import { esquemaDatosAdministracion, esquemaPrimerAdministrador } from "@ai/domain";
import { t } from "@ai/i18n";
import { enviarConfiguracionInicial } from "@/lib/configuracion";
import { crearClienteNavegador } from "@/lib/supabase/navegador";

const CLAVE_BORRADOR = "ai.configuracion_borrador";
const TOTAL_PASOS = 3;

type Borrador = {
  paso: number;
  codigo: string;
  nombre: string;
  cuit: string;
  telefono: string;
  emailContacto: string;
  direccion: string;
  nombreUsuario: string;
  email: string;
};

const vacio: Borrador = {
  paso: 0,
  codigo: "",
  nombre: "",
  cuit: "",
  telefono: "",
  emailContacto: "",
  direccion: "",
  nombreUsuario: "",
  email: "",
};

type Errores = Record<string, string>;

const erroresDe = (problemas: { path: PropertyKey[]; message: string }[]): Errores => {
  const errores: Errores = {};
  for (const p of problemas) errores[String(p.path[0])] ??= p.message;
  return errores;
};

const MENSAJES_DEL_SERVIDOR: Record<string, string> = {
  codigo_incorrecto: "configuracion.error_codigo_incorrecto",
  codigo_no_configurado: "configuracion.error_codigo_no_configurado",
  ya_configurada: "configuracion.error_ya_configurada",
  email_en_uso: "configuracion.error_email_en_uso",
  sin_conexion: "comun.error_red",
};

export function AsistenteConfiguracion() {
  const [d, setD] = useState<Borrador>(vacio);
  const [contrasena, setContrasena] = useState("");
  const [verContrasena, setVerContrasena] = useState(false);
  const [cuentaGoogle, setCuentaGoogle] = useState<{ email: string } | null>(null);
  const [errores, setErrores] = useState<Errores>({});
  const [mensaje, setMensaje] = useState<string>();
  const [enCurso, setEnCurso] = useState(false);
  const [listo, setListo] = useState(false);

  // Recupera lo escrito si se volvió de Google, y detecta si ya hay una cuenta con sesión.
  useEffect(() => {
    let borrador = vacio;
    try {
      const guardado = sessionStorage.getItem(CLAVE_BORRADOR);
      if (guardado) borrador = { ...vacio, ...(JSON.parse(guardado) as Partial<Borrador>) };
    } catch {
      /* sin almacenamiento de sesión: se empieza de cero */
    }
    crearClienteNavegador()
      .auth.getUser()
      .then(({ data }) => {
        const usuario = data.user;
        if (usuario?.email) {
          setCuentaGoogle({ email: usuario.email });
          const nombreGoogle = (usuario.user_metadata?.full_name ?? usuario.user_metadata?.name ?? "") as string;
          setD({ ...borrador, paso: borrador.paso || 2, nombreUsuario: borrador.nombreUsuario || nombreGoogle });
        } else {
          setD(borrador);
        }
      })
      .catch(() => setD(borrador));
  }, []);

  function cambiar(campo: keyof Borrador, valor: string) {
    setD((anterior) => ({ ...anterior, [campo]: valor }));
  }

  function guardarBorrador(actual: Borrador) {
    try {
      sessionStorage.setItem(CLAVE_BORRADOR, JSON.stringify(actual));
    } catch {
      /* sin almacenamiento de sesión */
    }
  }

  function irAlPaso(paso: number) {
    setErrores({});
    setMensaje(undefined);
    setD((anterior) => ({ ...anterior, paso }));
  }

  function siguiente() {
    if (d.paso === 0) {
      if (!d.codigo.trim()) return setErrores({ codigo: "validacion.nombre_obligatorio" });
      return irAlPaso(1);
    }
    const validado = esquemaDatosAdministracion.safeParse({
      nombre: d.nombre,
      cuit: d.cuit,
      contactoTelefono: d.telefono,
      contactoEmail: d.emailContacto,
      contactoDireccion: d.direccion,
    });
    if (!validado.success) return setErrores(erroresDe(validado.error.issues));
    irAlPaso(2);
  }

  async function usarGoogle() {
    guardarBorrador({ ...d, paso: 2 });
    const { error } = await crearClienteNavegador().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/configuracion-inicial` },
    });
    if (error) setMensaje("ingreso.error_google");
  }

  async function usarOtraCuenta() {
    await crearClienteNavegador().auth.signOut();
    setCuentaGoogle(null);
  }

  async function finalizar(evento: React.FormEvent) {
    evento.preventDefault();
    setMensaje(undefined);

    const administrador = cuentaGoogle
      ? esquemaPrimerAdministrador.pick({ nombre: true }).safeParse({ nombre: d.nombreUsuario })
      : esquemaPrimerAdministrador.safeParse({ nombre: d.nombreUsuario, email: d.email, contrasena });
    if (!administrador.success) return setErrores(erroresDe(administrador.error.issues));
    const organizacion = esquemaDatosAdministracion.safeParse({
      nombre: d.nombre,
      cuit: d.cuit,
      contactoTelefono: d.telefono,
      contactoEmail: d.emailContacto,
      contactoDireccion: d.direccion,
    });
    if (!organizacion.success) return irAlPaso(1);

    setErrores({});
    setEnCurso(true);
    const supabase = crearClienteNavegador();
    const token = cuentaGoogle ? (await supabase.auth.getSession()).data.session?.access_token : undefined;
    const datosAdmin = administrador.data as { nombre: string; email?: string; contrasena?: string };
    const error = await enviarConfiguracionInicial(
      {
        codigoInstalacion: d.codigo.trim(),
        organizacion: organizacion.data,
        administrador: cuentaGoogle
          ? { nombre: datosAdmin.nombre }
          : { nombre: datosAdmin.nombre, email: datosAdmin.email, contrasena: datosAdmin.contrasena },
      },
      token,
    );
    setEnCurso(false);

    if (error) {
      setMensaje(MENSAJES_DEL_SERVIDOR[error] ?? "configuracion.error_servidor");
      if (error === "codigo_incorrecto") setD((anterior) => ({ ...anterior, paso: 0 }));
      return;
    }

    try {
      sessionStorage.removeItem(CLAVE_BORRADOR);
    } catch {
      /* nada que limpiar */
    }
    setListo(true);
    if (!cuentaGoogle) {
      await supabase.auth.signInWithPassword({ email: datosAdmin.email!, password: datosAdmin.contrasena! });
    }
    // Recarga completa a propósito: el servidor tiene que leer la sesión recién creada.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/inicio");
  }

  if (listo) {
    return (
      <p className="formulario aviso-ok" role="status">
        {t("configuracion.hecha")}
      </p>
    );
  }

  const campoTexto = (campo: keyof Borrador, etiqueta: string, tipo = "text", autoComplete?: string) => (
    <div className="campo">
      <label htmlFor={campo}>{t(etiqueta)}</label>
      <input
        id={campo}
        type={tipo}
        autoComplete={autoComplete}
        value={d[campo] as string}
        onChange={(e) => cambiar(campo, e.target.value)}
        aria-invalid={Boolean(errores[campo])}
      />
      {errores[campo] && <span className="error-campo">{t(errores[campo])}</span>}
    </div>
  );

  return (
    <form className="formulario" onSubmit={finalizar} noValidate>
      <h2>{t("configuracion.titulo")}</h2>
      <p className="muted">{t("configuracion.paso", { actual: d.paso + 1, total: TOTAL_PASOS })}</p>

      {mensaje && (
        <p className="aviso-error" role="alert">
          {t(mensaje)}
        </p>
      )}

      {d.paso === 0 && (
        <>
          <h3>{t("configuracion.paso_codigo")}</h3>
          <p className="muted">{t("configuracion.texto")}</p>
          <p className="muted">{t("configuracion.codigo_ayuda")}</p>
          {campoTexto("codigo", "configuracion.codigo", "text", "off")}
        </>
      )}

      {d.paso === 1 && (
        <>
          <h3>{t("configuracion.paso_datos")}</h3>
          {campoTexto("nombre", "configuracion.nombre_administracion")}
          {campoTexto("cuit", "configuracion.cuit")}
          {campoTexto("telefono", "configuracion.telefono", "tel")}
          {campoTexto("emailContacto", "configuracion.email_contacto", "email")}
          {campoTexto("direccion", "configuracion.direccion")}
        </>
      )}

      {d.paso === 2 && (
        <>
          <h3>{t("configuracion.paso_administrador")}</h3>
          <p className="muted">{t("configuracion.modo_nube")}</p>
          {campoTexto("nombreUsuario", "configuracion.nombre_usuario", "text", "name")}

          {cuentaGoogle ? (
            <>
              <p className="aviso-ok">{t("configuracion.cuenta_google", { email: cuentaGoogle.email })}</p>
              <button type="button" className="boton-texto" onClick={usarOtraCuenta}>
                {t("configuracion.cambiar_cuenta")}
              </button>
            </>
          ) : (
            <>
              {campoTexto("email", "configuracion.email", "email", "email")}
              <div className="campo">
                <label htmlFor="contrasena">{t("configuracion.contrasena")}</label>
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
              <p className="separador">{t("comun.o")}</p>
              <button type="button" className="boton boton-secundario" onClick={usarGoogle}>
                {t("configuracion.usar_google")}
              </button>
            </>
          )}
        </>
      )}

      <div className="acciones">
        {d.paso > 0 && (
          <button type="button" className="boton boton-secundario" onClick={() => irAlPaso(d.paso - 1)}>
            {t("comun.anterior")}
          </button>
        )}
        {d.paso < TOTAL_PASOS - 1 ? (
          <button type="button" className="boton" onClick={siguiente}>
            {t("comun.siguiente")}
          </button>
        ) : (
          <button type="submit" className="boton" disabled={enCurso}>
            {t(enCurso ? "configuracion.finalizando" : "comun.finalizar")}
          </button>
        )}
      </div>
    </form>
  );
}
