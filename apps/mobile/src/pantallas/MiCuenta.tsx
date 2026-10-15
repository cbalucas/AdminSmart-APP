import { useEffect, useState } from "react";
import { View } from "react-native";
import { t } from "@ai/i18n";
import { Enlace, PantallaAcceso, Tarjeta, Texto, Titulo } from "../componentes";
import { supabase } from "../supabase";
import { FormularioNuevaContrasena } from "./NuevaContrasena";

// P-46 Mi cuenta (por ahora: datos de la cuenta y cambio de contraseña).
export function MiCuenta({ alVolver }: { alVolver: () => void }) {
  const [nombre, setNombre] = useState<string>();
  const [email, setEmail] = useState<string>();
  const [tieneContrasena, setTieneContrasena] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: sesion } = await supabase.auth.getUser();
      const user = sesion.user;
      if (!user) return;
      setEmail(user.email ?? undefined);
      // Quien ingresó solo con Google no tiene contraseña propia que cambiar.
      setTieneContrasena(((user.app_metadata?.providers as string[] | undefined) ?? []).includes("email"));
      const { data } = await supabase.from("usuario").select("nombre").eq("id", user.id).maybeSingle();
      setNombre((data as { nombre: string } | null)?.nombre);
    })().catch(() => undefined);
  }, []);

  return (
    <PantallaAcceso conCabecera={false}>
      <Tarjeta>
        <Titulo>{t("cuenta.titulo")}</Titulo>
        <View style={{ gap: 2 }}>
          <Texto atenuado>{t("cuenta.nombre")}</Texto>
          <Texto>{nombre ?? "—"}</Texto>
        </View>
        <View style={{ gap: 2 }}>
          <Texto atenuado>{t("cuenta.email")}</Texto>
          <Texto>{email ?? "—"}</Texto>
        </View>
        <Titulo nivel={3}>{t("cuenta.cambiar_contrasena")}</Titulo>
        {tieneContrasena ? (
          <FormularioNuevaContrasena alTerminar={alVolver} />
        ) : (
          <Texto atenuado>{t("cuenta.cuenta_google")}</Texto>
        )}
        <Enlace texto={t("cuenta.volver")} alPresionar={alVolver} />
      </Tarjeta>
    </PantallaAcceso>
  );
}
