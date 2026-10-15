import { useState } from "react";
import { esquemaNuevaContrasena } from "@ai/domain";
import { t } from "@ai/i18n";
import { Aviso, Boton, Campo, PantallaAcceso, Tarjeta, Texto, Titulo } from "../componentes";
import { supabase } from "../supabase";

// Formulario de cambio de contraseña: lo usan P-04 (después del enlace) y P-46 Mi cuenta.
export function FormularioNuevaContrasena({ alTerminar }: { alTerminar: () => void }) {
  const [contrasena, setContrasena] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [errores, setErrores] = useState<{ contrasena?: string; confirmacion?: string }>({});
  const [mensajeError, setMensajeError] = useState<string>();
  const [guardada, setGuardada] = useState(false);
  const [enCurso, setEnCurso] = useState(false);

  async function guardar() {
    setMensajeError(undefined);
    const validado = esquemaNuevaContrasena.safeParse({ contrasena, confirmacion });
    if (!validado.success) {
      const campos: { contrasena?: string; confirmacion?: string } = {};
      for (const problema of validado.error.issues) campos[problema.path[0] as "contrasena" | "confirmacion"] ??= problema.message;
      return setErrores(campos);
    }
    setErrores({});
    setEnCurso(true);
    try {
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
      <>
        <Aviso tipo="ok">{t("nueva_contrasena.guardada")}</Aviso>
        <Boton texto={t("nueva_contrasena.ir_inicio")} alPresionar={alTerminar} />
      </>
    );
  }
  return (
    <>
      <Texto atenuado>{t("nueva_contrasena.texto")}</Texto>
      {mensajeError ? <Aviso tipo="error">{t(mensajeError)}</Aviso> : null}
      <Campo
        etiqueta={t("nueva_contrasena.contrasena")}
        value={contrasena}
        onChangeText={setContrasena}
        error={errores.contrasena}
        secureTextEntry
        conMostrar
        autoCapitalize="none"
        autoComplete="new-password"
      />
      <Campo
        etiqueta={t("nueva_contrasena.confirmacion")}
        value={confirmacion}
        onChangeText={setConfirmacion}
        error={errores.confirmacion}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
      />
      <Boton texto={t("nueva_contrasena.guardar")} alPresionar={guardar} enCurso={enCurso} />
    </>
  );
}

// P-04 paso 3: se llega desde el enlace del email, que ya dejó la sesión abierta.
export function NuevaContrasena({ alTerminar }: { alTerminar: () => void }) {
  return (
    <PantallaAcceso>
      <Tarjeta>
        <Titulo>{t("nueva_contrasena.titulo")}</Titulo>
        <FormularioNuevaContrasena alTerminar={alTerminar} />
      </Tarjeta>
    </PantallaAcceso>
  );
}
