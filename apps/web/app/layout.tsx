import type { Metadata } from "next";
import { IBM_Plex_Sans, Source_Serif_4 } from "next/font/google";
import { colores } from "@ai/ui";
import { t } from "@ai/i18n";
import "./globals.css";

const serif = Source_Serif_4({ variable: "--fuente-titulo", subsets: ["latin"], weight: ["500", "600"] });
const sans = IBM_Plex_Sans({ variable: "--fuente-texto", subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: t("app.nombre"),
  description: t("app.lema"),
};

// Variables CSS generadas desde los tokens: modo claro por defecto y oscuro automático.
const aVariables = (modo: "claro" | "oscuro") =>
  Object.entries(colores[modo])
    .map(([nombre, valor]) => `--${nombre}:${valor};`)
    .join("");
// El modo se fija con data-tema (botón de la barra superior); sin elección guardada sigue al sistema.
const estilosTema =
  `:root{${aVariables("claro")}}` +
  `@media (prefers-color-scheme: dark){:root:not([data-tema]){${aVariables("oscuro")}}}` +
  `:root[data-tema="claro"]{${aVariables("claro")}}` +
  `:root[data-tema="oscuro"]{${aVariables("oscuro")}}`;

// Se ejecuta antes de dibujar la página para que no haya parpadeo entre modos.
const scriptTema = `try{var m=localStorage.getItem("tema");if(m!=="claro"&&m!=="oscuro"){m=matchMedia("(prefers-color-scheme: dark)").matches?"oscuro":"claro"}document.documentElement.dataset.tema=m}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" className={`${serif.variable} ${sans.variable}`} suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: estilosTema }} />
        <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
