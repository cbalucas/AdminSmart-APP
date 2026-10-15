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

type PropsBoton = { texto: string; alPresionar: () => void; secundario?: boolean; enCurso?: boolean; deshabilitado?: boolean };

export function Boton({ texto, alPresionar, secundario = false, enCurso = false, deshabilitado = false }: PropsBoton) {
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
        <Text style={{ fontFamily: fuentes.medio, fontSize: 16, color: secundario ? c.text : c.onAccent }}>{texto}</Text>
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
