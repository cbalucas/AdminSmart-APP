import { useEffect, useState } from "react";
import { View } from "react-native";
import { esquemaDatosAdministracion, esquemaPrimerAdministrador } from "@ai/domain";
import { t } from "@ai/i18n";
import { Aviso, Boton, Campo, Enlace, PantallaAcceso, Separador, Tarjeta, Texto, Titulo } from "../componentes";
import { enviarConfiguracionInicial } from "../configuracion";
import { ingresarConGoogle } from "../google";
import { supabase } from "../supabase";

const TOTAL_PASOS = 3;

const MENSAJES_DEL_SERVIDOR: Record<string, string> = {
  codigo_incorrecto: "configuracion.error_codigo_incorrecto",
  codigo_no_configurado: "configuracion.error_codigo_no_configurado",
  ya_configurada: "configuracion.error_ya_configurada",
  email_en_uso: "configuracion.error_email_en_uso",
  sin_conexion: "comun.error_red",
};

type Errores = Record<string, string>;
const erroresDe = (problemas: { path: PropertyKey[]; message: string }[]): Errores => {
  const errores: Errores = {};
  for (const p of problemas) errores[String(p.path[0])] ??= p.message;
  return errores;
};

// P-06 Configuración inicial: asistente del primer uso (solo modo nube por ahora).
export function Configuracion({ alTerminar }: { alTerminar: () => void }) {
  const [paso, setPaso] = useState(0);
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [cuit, setCuit] = useState("");
  const [telefono, setTelefono] = useState("");
  const [emailContacto, setEmailContacto] = useState("");
  const [direccion, setDireccion] = useState("");
  const [nombreUsuario, setNombreUsuario] = useState("");
  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [cuentaGoogle, setCuentaGoogle] = useState<string | null>(null);
  const [errores, setErrores] = useState<Errores>({});
  const [mensaje, setMensaje] = useState<string>();
  const [enCurso, setEnCurso] = useState(false);

  // Si ya hay una cuenta con sesión (por ejemplo, Google), el administrador será esa cuenta.
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) {
        setCuentaGoogle(data.user.email);
        setNombreUsuario((actual) => actual || ((data.user?.user_metadata?.full_name as string | undefined) ?? ""));
      }
    }).catch(() => undefined);
  }, []);

  const datosOrganizacion = () =>
    esquemaDatosAdministracion.safeParse({
      nombre,
      cuit,
      contactoTelefono: telefono,
      contactoEmail: emailContacto,
      contactoDireccion: direccion,
    });

  function irAlPaso(nuevo: number) {
    setErrores({});
    setMensaje(undefined);
    setPaso(nuevo);
  }

  function siguiente() {
    if (paso === 0) {
      if (!codigo.trim()) return setErrores({ codigo: "validacion.nombre_obligatorio" });
      return irAlPaso(1);
    }
    const validado = datosOrganizacion();
    if (!validado.success) return setErrores(erroresDe(validado.error.issues));
    irAlPaso(2);
  }

  async function usarGoogle() {
    setMensaje(undefined);
    setEnCurso(true);
    try {
      if (!(await ingresarConGoogle())) return setMensaje("ingreso.error_google");
      const { data } = await supabase.auth.getUser();
      if (data.user?.email) {
        setCuentaGoogle(data.user.email);
        setNombreUsuario((actual) => actual || ((data.user?.user_metadata?.full_name as string | undefined) ?? ""));
      }
    } catch {
      setMensaje("ingreso.error_google");
    } finally {
      setEnCurso(false);
    }
  }

  async function usarOtraCuenta() {
    await supabase.auth.signOut();
    setCuentaGoogle(null);
  }

  async function finalizar() {
    setMensaje(undefined);
    const administrador = cuentaGoogle
      ? esquemaPrimerAdministrador.pick({ nombre: true }).safeParse({ nombre: nombreUsuario })
      : esquemaPrimerAdministrador.safeParse({ nombre: nombreUsuario, email, contrasena });
    if (!administrador.success) return setErrores(erroresDe(administrador.error.issues));
    const organizacion = datosOrganizacion();
    if (!organizacion.success) return irAlPaso(1);

    setErrores({});
    setEnCurso(true);
    const token = cuentaGoogle ? (await supabase.auth.getSession()).data.session?.access_token : undefined;
    const datosAdmin = administrador.data as { nombre: string; email?: string; contrasena?: string };
    const error = await enviarConfiguracionInicial(
      {
        codigoInstalacion: codigo.trim(),
        organizacion: organizacion.data,
        administrador: cuentaGoogle
          ? { nombre: datosAdmin.nombre }
          : { nombre: datosAdmin.nombre, email: datosAdmin.email, contrasena: datosAdmin.contrasena },
      },
      token,
    );
    if (error) {
      setEnCurso(false);
      setMensaje(MENSAJES_DEL_SERVIDOR[error] ?? "configuracion.error_servidor");
      if (error === "codigo_incorrecto") setPaso(0);
      return;
    }
    if (!cuentaGoogle) {
      await supabase.auth.signInWithPassword({ email: datosAdmin.email!, password: datosAdmin.contrasena! });
    }
    setEnCurso(false);
    alTerminar();
  }

  return (
    <PantallaAcceso>
      <Tarjeta>
        <Titulo>{t("configuracion.titulo")}</Titulo>
        <Texto atenuado>{t("configuracion.paso", { actual: paso + 1, total: TOTAL_PASOS })}</Texto>
        {mensaje ? <Aviso tipo="error">{t(mensaje)}</Aviso> : null}

        {paso === 0 && (
          <>
            <Titulo nivel={3}>{t("configuracion.paso_codigo")}</Titulo>
            <Texto atenuado>{t("configuracion.texto")}</Texto>
            <Texto atenuado>{t("configuracion.codigo_ayuda")}</Texto>
            <Campo etiqueta={t("configuracion.codigo")} value={codigo} onChangeText={setCodigo} error={errores.codigo} secureTextEntry conMostrar autoCapitalize="none" autoCorrect={false} />
          </>
        )}

        {paso === 1 && (
          <>
            <Titulo nivel={3}>{t("configuracion.paso_datos")}</Titulo>
            <Campo etiqueta={t("configuracion.nombre_administracion")} value={nombre} onChangeText={setNombre} error={errores.nombre} />
            <Campo etiqueta={t("configuracion.cuit")} value={cuit} onChangeText={setCuit} error={errores.cuit} keyboardType="numbers-and-punctuation" />
            <Campo etiqueta={t("configuracion.telefono")} value={telefono} onChangeText={setTelefono} error={errores.contactoTelefono} keyboardType="phone-pad" />
            <Campo etiqueta={t("configuracion.email_contacto")} value={emailContacto} onChangeText={setEmailContacto} error={errores.contactoEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
            <Campo etiqueta={t("configuracion.direccion")} value={direccion} onChangeText={setDireccion} error={errores.contactoDireccion} />
          </>
        )}

        {paso === 2 && (
          <>
            <Titulo nivel={3}>{t("configuracion.paso_administrador")}</Titulo>
            <Texto atenuado>{t("configuracion.modo_nube")}</Texto>
            <Campo etiqueta={t("configuracion.nombre_usuario")} value={nombreUsuario} onChangeText={setNombreUsuario} error={errores.nombre} autoComplete="name" />
            {cuentaGoogle ? (
              <>
                <Aviso tipo="ok">{t("configuracion.cuenta_google", { email: cuentaGoogle })}</Aviso>
                <Enlace texto={t("configuracion.cambiar_cuenta")} alPresionar={usarOtraCuenta} />
              </>
            ) : (
              <>
                <Campo etiqueta={t("configuracion.email")} value={email} onChangeText={setEmail} error={errores.email} keyboardType="email-address" autoCapitalize="none" autoComplete="email" autoCorrect={false} />
                <Campo etiqueta={t("configuracion.contrasena")} value={contrasena} onChangeText={setContrasena} error={errores.contrasena} secureTextEntry conMostrar autoCapitalize="none" autoComplete="new-password" />
                <Separador />
                <Boton texto={t("configuracion.usar_google")} alPresionar={usarGoogle} secundario deshabilitado={enCurso} />
              </>
            )}
          </>
        )}

        <View style={{ flexDirection: "row", gap: 10, justifyContent: "flex-end" }}>
          {paso > 0 && (
            <View style={{ flex: 1 }}>
              <Boton texto={t("comun.anterior")} alPresionar={() => irAlPaso(paso - 1)} secundario />
            </View>
          )}
          <View style={{ flex: 1 }}>
            {paso < TOTAL_PASOS - 1 ? (
              <Boton texto={t("comun.siguiente")} alPresionar={siguiente} />
            ) : (
              <Boton texto={t(enCurso ? "configuracion.finalizando" : "comun.finalizar")} alPresionar={finalizar} enCurso={enCurso} />
            )}
          </View>
        </View>
      </Tarjeta>
    </PantallaAcceso>
  );
}
