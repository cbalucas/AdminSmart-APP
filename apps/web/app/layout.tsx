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
const estilosTema = `:root{${aVariables("claro")}}@media (prefers-color-scheme: dark){:root{${aVariables("oscuro")}}}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" className={`${serif.variable} ${sans.variable}`}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: estilosTema }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
