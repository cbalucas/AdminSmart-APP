import type { Rol } from "./usuario-actual";

export type IconoMenu =
  | "inicio" | "propietarios" | "bienes" | "edificios" | "inquilinos" | "contratos"
  | "obligaciones" | "cuentas" | "liquidaciones" | "reportes" | "auditoria" | "configuracion";

export interface ItemMenu {
  clave: string; // texto: menu.<clave>
  ruta: string;
  icono: IconoMenu;
  soloAdministrador?: boolean;
}

// Menú lateral de la gestión (mapa de pantallas, prototipo Main).
const MENU_GESTION: ItemMenu[] = [
  { clave: "inicio", ruta: "/inicio", icono: "inicio" },
  { clave: "propietarios", ruta: "/propietarios", icono: "propietarios" },
  { clave: "bienes", ruta: "/bienes", icono: "bienes" },
  { clave: "inquilinos", ruta: "/inquilinos", icono: "inquilinos" },
  { clave: "contratos", ruta: "/contratos", icono: "contratos" },
  { clave: "obligaciones", ruta: "/obligaciones", icono: "obligaciones" },
  { clave: "cuentas", ruta: "/cuentas-corrientes", icono: "cuentas" },
  { clave: "liquidaciones", ruta: "/liquidaciones", icono: "liquidaciones" },
  { clave: "reportes", ruta: "/reportes", icono: "reportes" },
  { clave: "auditoria", ruta: "/auditoria", icono: "auditoria" },
  { clave: "configuracion", ruta: "/configuracion", icono: "configuracion", soloAdministrador: true },
];

const MENU_PROPIETARIO: ItemMenu[] = [{ clave: "inicio", ruta: "/inicio", icono: "inicio" }];

export function esGestion(roles: readonly Rol[]): boolean {
  return roles.includes("administrador") || roles.includes("operador");
}

/** Cada rol ve solo su menú: la gestión (el operador sin Configuración) o, para propietarios e inquilinos, su inicio. */
export function menuPara(roles: readonly Rol[]): ItemMenu[] {
  if (!esGestion(roles)) return MENU_PROPIETARIO;
  const esAdmin = roles.includes("administrador");
  return MENU_GESTION.filter((i) => esAdmin || !i.soloAdministrador);
}
