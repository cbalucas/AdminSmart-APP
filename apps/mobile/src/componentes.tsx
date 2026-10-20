import { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  useColorScheme,
  type TextInputProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path, Rect } from "react-native-svg";
import { colores, logoMosaico as logo, type TokensColor } from "@ai/ui";
import { t } from "@ai/i18n";

// Colores del modo del dispositivo (sección 12) y tipografías cargadas en App.tsx.
export function useTema() {
  const modo = useColorScheme() === "dark" ? "oscuro" : "claro";
  const c: TokensColor = colores[modo];
  const fuentes = {
    titulo: modo === "claro" ? "SourceSerif4_600SemiBold" : "SourceSerif4_500Medium",
    texto: "IBMPlexSans_400Regular",
    medio: "IBMPlexSans_500Medium",
  };
  return { modo, c, fuentes };
}

export function Logo({ tamano = 72 }: { tamano?: number }) {
  return (
    <Svg width={tamano} height={tamano} viewBox={logo.viewBox}>
      <Rect width={64} height={64} rx={logo.radioFondo} fill={logo.fondo} />
      {logo.piezasBlancas.map((p) => (
        <Rect key={`${p.x}-${p.y}`} x={p.x} y={p.y} width={logo.lado} height={logo.lado} rx={logo.radioPieza} fill={logo.pieza} />
      ))}
      <Path d={logo.caminoAmbar} fill={logo.piezaAmbar} />
    </Svg>
  );
}

// Pantalla de acceso: fondo, teclado que no tapa los campos y contenido centrado.
export function PantallaAcceso({ children, conCabecera = true }: { children: ReactNode; conCabecera?: boolean }) {
  const { c, fuentes } = useTema();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={estilos.pantalla} keyboardShouldPersistTaps="handled">
          {conCabecera && (
            <View style={estilos.cabecera}>
              <Logo />
              <Text style={{ fontFamily: fuentes.titulo, fontSize: 26, color: c.text }}>{t("app.nombre")}</Text>
            </View>
          )}
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Tarjeta({ children }: { children: ReactNode }) {
  const { c } = useTema();
  return <View style={[estilos.tarjeta, { backgroundColor: c.surface, borderColor: c.line }]}>{children}</View>;
}

export function Titulo({ children, nivel = 2 }: { children: ReactNode; nivel?: 2 | 3 }) {
  const { c, fuentes } = useTema();
  return <Text style={{ fontFamily: fuentes.titulo, fontSize: nivel === 2 ? 22 : 17, color: c.text }}>{children}</Text>;
}

export function Texto({ children, atenuado = false }: { children: ReactNode; atenuado?: boolean }) {
  const { c, fuentes } = useTema();
  return <Text style={{ fontFamily: fuentes.texto, fontSize: 15, color: atenuado ? c.muted : c.text }}>{children}</Text>;
}

// Los avisos llevan su texto escrito además del color (sección 12).
export function Aviso({ tipo, children }: { tipo: "error" | "ok"; children: ReactNode }) {
  const { c, fuentes } = useTema();
  const [color, fondo] = tipo === "error" ? [c.danger, c.dangerBg] : [c.ok, c.okBg];
  return (
    <View style={[estilos.aviso, { backgroundColor: fondo }]} accessibilityRole="alert">
      <Text style={{ fontFamily: fuentes.texto, fontSize: 14, color }}>{children}</Text>
    </View>
  );
}

type PropsCampo = Omit<TextInputProps, "style"> & { etiqueta: string; error?: string; conMostrar?: boolean };

export function Campo({ etiqueta, error, conMostrar = false, secureTextEntry, ...resto }: PropsCampo) {
  const { c, fuentes } = useTema();
  const [oculto, setOculto] = useState(true);
  const esSecreto = Boolean(secureTextEntry) && !(conMostrar && !oculto);
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontFamily: fuentes.medio, fontSize: 14, color: c.text }}>{etiqueta}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <TextInput
          {...resto}
          secureTextEntry={esSecreto}
          placeholderTextColor={c.muted}
          accessibilityLabel={etiqueta}
          style={[
            estilos.campo,
            { color: c.text, backgroundColor: c.surface, borderColor: error ? c.danger : c.inputLine, fontFamily: fuentes.texto },
          ]}
        />
        {conMostrar && (
          <Pressable onPress={() => setOculto((v) => !v)} accessibilityRole="button" hitSlop={8}>
            <Text style={{ fontFamily: fuentes.medio, fontSize: 14, color: c.accent }}>
              {t(oculto ? "comun.mostrar" : "comun.ocultar")}
            </Text>
          </Pressable>
        )}
      </View>
      {error ? <Text style={{ fontFamily: fuentes.texto, fontSize: 13, color: c.danger }}>{t(error)}</Text> : null}
    </View>
  );
}

type PropsBoton = { icono?: ReactNode; texto: string; alPresionar: () => void; secundario?: boolean; enCurso?: boolean; deshabilitado?: boolean };

// Logo oficial de Google ("G" de cuatro colores), para el botón de ingreso.
export function IconoGoogle() {
  return (
    <Svg width={20} height={20} viewBox="0 0 48 48">
      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <Path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 0 1 9.5 24c0-1.59.28-3.14.76-4.59l-7.98-6.19A23.99 23.99 0 0 0 0 24c0 3.77.9 7.35 2.56 10.78l7.97-6.19z" />
      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </Svg>
  );
}

export function Boton({ icono, texto, alPresionar, secundario = false, enCurso = false, deshabilitado = false }: PropsBoton) {
  const { c, fuentes } = useTema();
  const inactivo = enCurso || deshabilitado;
  return (
    <Pressable
      onPress={alPresionar}
      disabled={inactivo}
      accessibilityRole="button"
      style={[
        estilos.boton,
        secundario
          ? { backgroundColor: c.surface, borderColor: c.inputLine }
          : { backgroundColor: c.accent, borderColor: c.accent },
        inactivo && { opacity: 0.6 },
      ]}
    >
      {enCurso ? (
        <ActivityIndicator color={secundario ? c.text : c.onAccent} />
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 }}>
          {icono}
          <Text style={{ fontFamily: fuentes.medio, fontSize: 16, color: secundario ? c.text : c.onAccent }}>{texto}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function Enlace({ texto, alPresionar }: { texto: string; alPresionar: () => void }) {
  const { c, fuentes } = useTema();
  return (
    <Pressable onPress={alPresionar} accessibilityRole="link" hitSlop={8} style={{ alignSelf: "center", padding: 6 }}>
      <Text style={{ fontFamily: fuentes.medio, fontSize: 14, color: c.accent, textDecorationLine: "underline" }}>{texto}</Text>
    </Pressable>
  );
}

export function Interruptor({ etiqueta, valor, alCambiar }: { etiqueta: string; valor: boolean; alCambiar: (v: boolean) => void }) {
  const { c, fuentes } = useTema();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <Text style={{ flex: 1, fontFamily: fuentes.texto, fontSize: 15, color: c.text }}>{etiqueta}</Text>
      <Switch
        value={valor}
        onValueChange={alCambiar}
        accessibilityLabel={etiqueta}
        trackColor={{ false: c.inputLine, true: c.accent }}
        thumbColor={c.surface}
      />
    </View>
  );
}

export function Separador() {
  const { c, fuentes } = useTema();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: c.line }} />
      <Text style={{ fontFamily: fuentes.texto, fontSize: 13, color: c.muted }}>{t("comun.o")}</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: c.line }} />
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flexGrow: 1, alignItems: "center", justifyContent: "center", gap: 20, padding: 20 },
  cabecera: { alignItems: "center", gap: 8 },
  tarjeta: { width: "100%", maxWidth: 440, borderWidth: 1, borderRadius: 14, padding: 22, gap: 14 },
  aviso: { borderRadius: 8, padding: 10 },
  campo: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  boton: { alignItems: "center", justifyContent: "center", borderWidth: 1, borderRadius: 8, paddingVertical: 12, minHeight: 46 },
});
