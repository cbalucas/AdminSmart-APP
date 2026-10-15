import { useEffect, useState } from "react";
import { View } from "react-native";
import { t } from "@ai/i18n";
import { Aviso, Boton, Logo, PantallaAcceso, Tarjeta, Texto, Titulo } from "../componentes";
import { supabase } from "../supabase";

type Usuario = { nombre: string; roles: string[]; estado: string };

// Inicio provisorio: confirma quién ingresó y con qué roles. Los tableros llegan en otras tareas.
export function Inicio({ alAbrirCuenta }: { alAbrirCuenta: () => void }) {
  const [cargando, setCargando] = useState(true);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [email, setEmail] = useState<string>();
  const [errorRed, setErrorRed] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: sesion } = await supabase.auth.getUser();
      setEmail(sesion.user?.email ?? undefined);
      if (!sesion.user) return setCargando(false);
      // La base solo devuelve la fila propia (RLS); si no hay fila, la cuenta no tiene acceso.
      const { data, error } = await supabase
        .from("usuario")
        .select("nombre, roles, estado")
        .eq("id", sesion.user.id)
        .maybeSingle();
      setErrorRed(Boolean(error));
      setUsuario((data as Usuario | null) ?? null);
      setCargando(false);
    })().catch(() => {
      setErrorRed(true);
      setCargando(false);
    });
  }, []);

  const salir = <Boton texto={t("ingreso.cerrar_sesion")} alPresionar={() => supabase.auth.signOut()} secundario />;

  if (cargando) {
    return (
      <PantallaAcceso conCabecera={false}>
        <Logo />
        <Texto atenuado>{t("app.cargando")}</Texto>
      </PantallaAcceso>
    );
  }

  if (errorRed) {
    return (
      <PantallaAcceso>
        <Tarjeta>
          <Aviso tipo="error">{t("comun.error_red")}</Aviso>
          {salir}
        </Tarjeta>
      </PantallaAcceso>
    );
  }

  if (!usuario || usuario.estado !== "activo") {
    return (
      <PantallaAcceso>
        <Tarjeta>
          <Titulo>{t("ingreso.sin_acceso_titulo")}</Titulo>
          <Texto atenuado>{t("ingreso.sin_acceso_texto")}</Texto>
          <Texto atenuado>{email}</Texto>
          {salir}
        </Tarjeta>
      </PantallaAcceso>
    );
  }

  const roles = usuario.roles.map((rol) => t(`rol.${rol}`)).join(", ");
  return (
    <PantallaAcceso>
      <Tarjeta>
        <Titulo>{t("inicio.saludo", { nombre: usuario.nombre })}</Titulo>
        <Texto atenuado>{t("inicio.roles", { roles })}</Texto>
        <View>
          <Aviso tipo="ok">{t("inicio.estado")}</Aviso>
        </View>
        <Boton texto={t("cuenta.titulo")} alPresionar={alAbrirCuenta} secundario />
        {salir}
      </Tarjeta>
    </PantallaAcceso>
  );
}
