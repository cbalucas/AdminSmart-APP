import { useCallback, useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import * as Linking from "expo-linking";
import { useFonts } from "expo-font";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SourceSerif4_500Medium, SourceSerif4_600SemiBold } from "@expo-google-fonts/source-serif-4";
import { IBMPlexSans_400Regular, IBMPlexSans_500Medium } from "@expo-google-fonts/ibm-plex-sans";
import { t } from "@ai/i18n";
import { consultarConfiguracion } from "./src/configuracion";
import { supabase } from "./src/supabase";
import { Configuracion } from "./src/pantallas/Configuracion";
import { Ingreso } from "./src/pantallas/Ingreso";
import { Inicio } from "./src/pantallas/Inicio";
import { MiCuenta } from "./src/pantallas/MiCuenta";
import { NuevaContrasena } from "./src/pantallas/NuevaContrasena";
import { Recuperar } from "./src/pantallas/Recuperar";
import { PantallaAcceso, Logo, Texto, useTema } from "./src/componentes";

type Pantalla = "cargando" | "configuracion" | "ingreso" | "recuperar" | "nueva_contrasena" | "inicio" | "mi_cuenta";

export default function App() {
  const [fuentesListas] = useFonts({
    SourceSerif4_500Medium,
    SourceSerif4_600SemiBold,
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
  });

  return (
    <SafeAreaProvider>
      {fuentesListas ? <Aplicacion /> : null}
    </SafeAreaProvider>
  );
}

function Aplicacion() {
  const { modo } = useTema();
  const [pantalla, setPantalla] = useState<Pantalla>("cargando");
  const [errorIngreso, setErrorIngreso] = useState<string>();

  // P-01 Inicio: decide a dónde ir según la configuración y la sesión.
  useEffect(() => {
    (async () => {
      if ((await consultarConfiguracion()) === false) return setPantalla("configuracion");
      const { data } = await supabase.auth.getSession();
      setPantalla(data.session ? "inicio" : "ingreso");
    })().catch(() => setPantalla("ingreso"));
  }, []);

  // Cerrar sesión (en cualquier pantalla) vuelve al ingreso.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === "SIGNED_OUT") setPantalla("ingreso");
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // Enlace del email de recuperación: la app se abre con un código que se canjea por la sesión.
  const manejarEnlace = useCallback(async (url: string | null) => {
    if (!url) return;
    const { path, queryParams } = Linking.parse(url);
    if (path !== "recuperar/nueva") return;
    const codigo = typeof queryParams?.code === "string" ? queryParams.code : undefined;
    const { error } = codigo ? await supabase.auth.exchangeCodeForSession(codigo) : { error: new Error("sin código") };
    if (error) {
      setErrorIngreso("ingreso.error_enlace");
      setPantalla("ingreso");
    } else {
      setPantalla("nueva_contrasena");
    }
  }, []);

  useEffect(() => {
    Linking.getInitialURL().then(manejarEnlace).catch(() => undefined);
    const suscripcion = Linking.addEventListener("url", ({ url }) => void manejarEnlace(url));
    return () => suscripcion.remove();
  }, [manejarEnlace]);

  const barra = <StatusBar style={modo === "claro" ? "dark" : "light"} />;

  let contenido;
  switch (pantalla) {
    case "configuracion":
      contenido = <Configuracion alTerminar={() => setPantalla("inicio")} />;
      break;
    case "ingreso":
      contenido = (
        <Ingreso
          errorInicial={errorIngreso}
          alIngresar={() => {
            setErrorIngreso(undefined);
            setPantalla("inicio");
          }}
          alRecuperar={() => setPantalla("recuperar")}
        />
      );
      break;
    case "recuperar":
      contenido = <Recuperar alVolver={() => setPantalla("ingreso")} />;
      break;
    case "nueva_contrasena":
      contenido = <NuevaContrasena alTerminar={() => setPantalla("inicio")} />;
      break;
    case "inicio":
      contenido = <Inicio alAbrirCuenta={() => setPantalla("mi_cuenta")} />;
      break;
    case "mi_cuenta":
      contenido = <MiCuenta alVolver={() => setPantalla("inicio")} />;
      break;
    default:
      contenido = (
        <PantallaAcceso conCabecera={false}>
          <Logo />
          <Texto atenuado>{t("app.cargando")}</Texto>
        </PantallaAcceso>
      );
  }

  return (
    <>
      {contenido}
      {barra}
    </>
  );
}
