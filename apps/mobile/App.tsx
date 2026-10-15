import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View, useColorScheme } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import { useFonts } from "expo-font";
import { SourceSerif4_500Medium, SourceSerif4_600SemiBold } from "@expo-google-fonts/source-serif-4";
import { IBMPlexSans_400Regular, IBMPlexSans_500Medium } from "@expo-google-fonts/ibm-plex-sans";
import { colores, logoMosaico as logo } from "@ai/ui";
import { t } from "@ai/i18n";

export default function App() {
  const modo = useColorScheme() === "dark" ? "oscuro" : "claro";
  const c = colores[modo];
  const [fuentesListas] = useFonts({
    SourceSerif4_500Medium,
    SourceSerif4_600SemiBold,
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
  });

  if (!fuentesListas) return null;

  return (
    <View style={[estilos.contenedor, { backgroundColor: c.bg }]}>
      <View style={[estilos.tarjeta, { backgroundColor: c.surface, borderColor: c.line }]}>
        <Svg width={96} height={96} viewBox={logo.viewBox}>
          <Rect width={64} height={64} rx={logo.radioFondo} fill={logo.fondo} />
          {logo.piezasBlancas.map((p) => (
            <Rect key={`${p.x}-${p.y}`} x={p.x} y={p.y} width={logo.lado} height={logo.lado} rx={logo.radioPieza} fill={logo.pieza} />
          ))}
          <Path d={logo.caminoAmbar} fill={logo.piezaAmbar} />
        </Svg>
        <Text
          style={[
            estilos.titulo,
            { color: c.text, fontFamily: modo === "claro" ? "SourceSerif4_600SemiBold" : "SourceSerif4_500Medium" },
          ]}
        >
          {t("app.nombre")}
        </Text>
        <View style={[estilos.resalte, { backgroundColor: c.highlight }]} />
        <Text style={[estilos.texto, { color: c.muted }]}>{t("app.lema")}</Text>
        <View style={[estilos.etiqueta, { backgroundColor: c.okBg }]}>
          <Text style={[estilos.textoEtiqueta, { color: c.ok }]}>{t("inicio.estado")}</Text>
        </View>
      </View>
      <Text style={[estilos.texto, { color: c.muted }]}>{t("inicio.version")}</Text>
      <StatusBar style={modo === "claro" ? "dark" : "light"} />
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 24 },
  tarjeta: { borderWidth: 1, borderRadius: 14, padding: 28, alignItems: "center", gap: 12, maxWidth: 420 },
  titulo: { fontSize: 26, textAlign: "center" },
  texto: { fontFamily: "IBMPlexSans_400Regular", fontSize: 15, textAlign: "center" },
  resalte: { width: 40, height: 4, borderRadius: 2 },
  etiqueta: { borderRadius: 999, paddingVertical: 4, paddingHorizontal: 12 },
  textoEtiqueta: { fontFamily: "IBMPlexSans_500Medium", fontSize: 13, textAlign: "center" },
});
