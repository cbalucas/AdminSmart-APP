import { useState } from "react";
import * as Linking from "expo-linking";
import { esquemaRecuperacion } from "@ai/domain";
import { t } from "@ai/i18n";
import { Aviso, Boton, Campo, Enlace, PantallaAcceso, Tarjeta, Texto, Titulo } from "../componentes";
import { supabase } from "../supabase";

// P-04 Recuperar contraseña, pasos 1 y 2: se pide el email y se envía el enlace.
export function Recuperar({ alVolver }: { alVolver: () => void }) {
  const [email, setEmail] = useState("");
  const [errorEmail, setErrorEmail] = useState<string>();
  const [mensajeError, setMensajeError] = useState<string>();
  const [enviado, setEnviado] = useState(false);
  const [enCurso, setEnCurso] = useState(false);

  async function enviar() {
    setMensajeError(undefined);
    const validado = esquemaRecuperacion.safeParse({ email });
    if (!validado.success) return setErrorEmail(validado.error.issues[0]?.message);
    setErrorEmail(undefined);
    setEnCurso(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(validado.data.email, {
        // El enlace del email abre la app en esta dirección (ver App.tsx).
        redirectTo: Linking.createURL("recuperar/nueva"),
      });
      // Por seguridad no se revela si el email existe: el mensaje es el mismo.
      if (error && (error.status === 0 || /network|fetch/i.test(error.message))) setMensajeError("comun.error_red");
      else setEnviado(true);
    } catch {
      setMensajeError("comun.error_red");
    } finally {
      setEnCurso(false);
    }
  }

  return (
    <PantallaAcceso>
      <Tarjeta>
        <Titulo>{t("recuperar.titulo")}</Titulo>
        {enviado ? (
          <Aviso tipo="ok">{t("recuperar.enviado")}</Aviso>
        ) : (
          <>
            <Texto atenuado>{t("recuperar.texto")}</Texto>
            {mensajeError ? <Aviso tipo="error">{t(mensajeError)}</Aviso> : null}
            <Campo
              etiqueta={t("ingreso.email")}
              value={email}
              onChangeText={setEmail}
              error={errorEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
            />
            <Boton texto={t("recuperar.enviar")} alPresionar={enviar} enCurso={enCurso} />
          </>
        )}
        <Enlace texto={t("comun.volver_ingreso")} alPresionar={alVolver} />
      </Tarjeta>
    </PantallaAcceso>
  );
}
