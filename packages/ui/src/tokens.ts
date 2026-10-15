// Tokens de color y tipografía: sección 12 del mapa de pantallas.
// Toda pantalla usa estos tokens, nunca colores sueltos.

export const coloresClaro = {
  bg: "#F3F5F8",
  surface: "#FFFFFF",
  surface2: "#F8FAFC",
  sidebar: "#18212B",
  sidebarActive: "#2C3846",
  line: "#D8DEE6",
  lineSoft: "#ECF0F4",
  inputLine: "#C5CDD8",
  text: "#18212B",
  muted: "#55606B",
  accent: "#1F3A5F",
  highlight: "#E8A33D",
  onAccent: "#FFFFFF",
  danger: "#8A1F14",
  dangerBg: "#F9E3E0",
  neutral: "#3D4752",
  neutralBg: "#ECF0F4",
  ok: "#14453A",
  okBg: "#E3EEEA",
  warn: "#8A4B00",
  warnBg: "#FBF3E4",
  warnLine: "#EBD3A6",
} as const;

export type TokensColor = { [K in keyof typeof coloresClaro]: string };

export const coloresOscuro: TokensColor = {
  bg: "#12171D",
  surface: "#1A2129",
  surface2: "#222B35",
  sidebar: "#0D1116",
  sidebarActive: "#222B35",
  line: "#2E3843",
  lineSoft: "#252E38",
  inputLine: "#3A4552",
  text: "#E8ECEF",
  muted: "#9AA6B2",
  accent: "#8DB4E6",
  highlight: "#F0B85A",
  onAccent: "#0E1A2B",
  danger: "#F2948A",
  dangerBg: "#3A1F1C",
  neutral: "#C3CBD3",
  neutralBg: "#2A333D",
  ok: "#7DD3B2",
  okBg: "#17332A",
  warn: "#E8B460",
  warnBg: "#2B2214",
  warnLine: "#5A4420",
};

export type Modo = "claro" | "oscuro";

export const colores: Record<Modo, TokensColor> = {
  claro: coloresClaro,
  oscuro: coloresOscuro,
};

export const tipografia = {
  titulo: "Source Serif 4", // títulos e importes destacados (600 claro, 500 oscuro)
  texto: "IBM Plex Sans", // resto de la interfaz, con cifras tabulares
  pesoTitulo: { claro: 600, oscuro: 500 },
} as const;

// Logo Mosaico: cuatro piezas, azul #1F3A5F con una pieza ámbar #E8A33D (viewBox 0 0 64 64).
export const logoMosaico = {
  viewBox: "0 0 64 64",
  fondo: "#1F3A5F",
  pieza: "#FFFFFF",
  piezaAmbar: "#E8A33D",
  piezasBlancas: [
    { x: 12, y: 12 },
    { x: 12, y: 34 },
    { x: 34, y: 34 },
  ],
  lado: 18,
  radioPieza: 4,
  radioFondo: 15,
  caminoAmbar:
    "M34 30 V16 a4 4 0 0 1 4 -4 h0 a18 18 0 0 1 14 14 v0 a4 4 0 0 1 -4 4 Z",
} as const;
