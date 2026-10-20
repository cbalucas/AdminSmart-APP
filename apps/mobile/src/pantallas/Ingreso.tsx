import { useEffect, useState } from "react";
import { esquemaIngreso } from "@ai/domain";
import { t } from "@ai/i18n";
import { guardarPreferencia, leerPreferencia } from "../almacenamiento";
import { Aviso, Boton, Campo, Enlace, IconoGoogle, Interruptor, PantallaAcceso, Separador, Tarjeta, Titulo } from "../componentes";
import { ingresarConGoogle } from "../google";
import { ingresarConIdentificador } from "../ingreso";
import { supabase } from "../supabase";

const CLAVE_EMAIL = "ai.email_recordado";

type Props = { errorInicial?: string; alIngresar: () => void; alRecuperar: () => void };

// P-02 Ingreso
export function Ingreso({ errorInicial, alIngresar, alRecuperar }: Props) {
  const [identificador, setIdentificador] = useState(() => leerPreferencia(CLAVE_EMAIL) ?? "");
  const [contrasena, setContrasena] = useState("");
  const [recordar, setRecordar] = useState(true);
  const [errores, setErrores] = useState<{ identificador?: string; contrasena?: string }>({});
  const [mensaje, setMensaje] = useState<string | undefined>(errorInicial);
  const [enCurso, setEnCurso] = useState(false);

  useEffect(() => setMensaje(errorInicial), [errorInicial]);

  async function ingresar() {
    setMensaje(undefined);
    const validado = esquemaIngreso.safeParse({ identificador, contrasena });
    if (!validado.success) {
      const campos: { identificador?: string; contrasena?: string } = {};
      for (const problema of validado.error.issues) campos[problema.path[0] as "identificador" | "contrasena"] ??= problema.message;
      return setErrores(campos);
    }
    setErrores({});
    setEnCurso(true);
    const resultado = await ingresarConIdentificador(validado.data.identificador, validado.data.contrasena);
    setEnCurso(false);
    if (resultado !== "ok") return setMensaje(resultado === "red" ? "comun.error_red" : "ingreso.error_credenciales");
    guardarPreferencia(CLAVE_EMAIL, recordar ? validado.data.identificador : null);
    alIngresar();
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
          etiqueta={t("ingreso.identificador")}
          value={identificador}
          onChangeText={setIdentificador}
          error={errores.identificador}
          autoCapitalize="none"
          autoComplete="username"
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
        <Boton icono={<IconoGoogle />} texto={t("ingreso.google")} alPresionar={conGoogle} secundario deshabilitado={enCurso} />
        <Enlace texto={t("ingreso.olvide")} alPresionar={alRecuperar} />
      </Tarjeta>
    </PantallaAcceso>
  );
}
