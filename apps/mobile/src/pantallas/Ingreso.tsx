import { useEffect, useState } from "react";
import { esquemaIngreso } from "@ai/domain";
import { t } from "@ai/i18n";
import { guardarPreferencia, leerPreferencia } from "../almacenamiento";
import { Aviso, Boton, Campo, Enlace, Interruptor, PantallaAcceso, Separador, Tarjeta, Titulo } from "../componentes";
import { ingresarConGoogle } from "../google";
import { supabase } from "../supabase";

const CLAVE_EMAIL = "ai.email_recordado";

type Props = { errorInicial?: string; alIngresar: () => void; alRecuperar: () => void };

// P-02 Ingreso
export function Ingreso({ errorInicial, alIngresar, alRecuperar }: Props) {
  const [email, setEmail] = useState(() => leerPreferencia(CLAVE_EMAIL) ?? "");
  const [contrasena, setContrasena] = useState("");
  const [recordar, setRecordar] = useState(true);
  const [errores, setErrores] = useState<{ email?: string; contrasena?: string }>({});
  const [mensaje, setMensaje] = useState<string | undefined>(errorInicial);
  const [enCurso, setEnCurso] = useState(false);

  useEffect(() => setMensaje(errorInicial), [errorInicial]);

  async function ingresar() {
    setMensaje(undefined);
    const validado = esquemaIngreso.safeParse({ email, contrasena });
    if (!validado.success) {
      const campos: { email?: string; contrasena?: string } = {};
      for (const problema of validado.error.issues) campos[problema.path[0] as "email" | "contrasena"] ??= problema.message;
      return setErrores(campos);
    }
    setErrores({});
    setEnCurso(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: validado.data.email,
        password: validado.data.contrasena,
      });
      if (error) {
        setMensaje(error.status === 0 || /network|fetch/i.test(error.message) ? "comun.error_red" : "ingreso.error_credenciales");
        return;
      }
      guardarPreferencia(CLAVE_EMAIL, recordar ? validado.data.email : null);
      alIngresar();
    } catch {
      setMensaje("comun.error_red");
    } finally {
      setEnCurso(false);
    }
  }

  async function conGoogle() {
    setMensaje(undefined);
    setEnCurso(true);
    try {
      if (await ingresarConGoogle()) alIngresar();
      else setMensaje("ingreso.error_google");
    } catch {
      setMensaje("ingreso.error_google");
    } finally {
      setEnCurso(false);
    }
  }

  return (
    <PantallaAcceso>
      <Tarjeta>
        <Titulo>{t("ingreso.titulo")}</Titulo>
        {mensaje ? <Aviso tipo="error">{t(mensaje)}</Aviso> : null}
        <Campo
          etiqueta={t("ingreso.email")}
          value={email}
          onChangeText={setEmail}
          error={errores.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
        />
        <Campo
          etiqueta={t("ingreso.contrasena")}
          value={contrasena}
          onChangeText={setContrasena}
          error={errores.contrasena}
          secureTextEntry
          conMostrar
          autoCapitalize="none"
          autoComplete="current-password"
        />
        <Interruptor etiqueta={t("ingreso.recordar_email")} valor={recordar} alCambiar={setRecordar} />
        <Boton texto={t("ingreso.boton")} alPresionar={ingresar} enCurso={enCurso} />
        <Separador />
        <Boton texto={t("ingreso.google")} alPresionar={conGoogle} secundario deshabilitado={enCurso} />
        <Enlace texto={t("ingreso.olvide")} alPresionar={alRecuperar} />
      </Tarjeta>
    </PantallaAcceso>
  );
}
