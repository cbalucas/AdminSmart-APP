import path from "node:path";
import { Font } from "@react-pdf/renderer";

// Tipografías del sistema (IBM Plex Sans para el texto y Source Serif 4 para títulos e importes), tomadas de
// los paquetes @fontsource. Se registran una sola vez por proceso.
let registradas = false;

const archivo = (paquete: string, nombre: string) => path.join(process.cwd(), "node_modules", "@fontsource", paquete, "files", nombre);

export function registrarFuentes() {
  if (registradas) return;
  Font.register({
    family: "Plex",
    fonts: [
      { src: archivo("ibm-plex-sans", "ibm-plex-sans-latin-400-normal.woff"), fontWeight: 400 },
      { src: archivo("ibm-plex-sans", "ibm-plex-sans-latin-600-normal.woff"), fontWeight: 600 },
    ],
  });
  Font.register({
    family: "Serif",
    fonts: [
      { src: archivo("source-serif-4", "source-serif-4-latin-600-normal.woff"), fontWeight: 600 },
      { src: archivo("source-serif-4", "source-serif-4-latin-700-normal.woff"), fontWeight: 700 },
    ],
  });
  // Sin guiones automáticos en las palabras largas.
  Font.registerHyphenationCallback((palabra) => [palabra]);
  registradas = true;
}
