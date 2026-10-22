// Historial de versiones de la aplicación (se muestra en el menú). La más nueva va primera.
// Al sacar una versión nueva se agrega acá, se resume en docs/VERSIONES.md y se actualiza apps/mobile/app.json.

export interface VersionApp {
  /** MAYOR.MENOR.PARCHE */
  version: string;
  /** AAAA-MM-DD */
  fecha: string;
  titulo: string;
  resumen: string;
  /** Lo más relevante, en lenguaje claro. */
  puntos: string[];
}

export const VERSIONES: readonly VersionApp[] = [
  {
    version: "1.0.0",
    fecha: "2026-10-22",
    titulo: "Fase 1: gastos y depósitos",
    resumen:
      "Primera versión completa: se cargan bienes, impuestos y servicios, se registran los pagos, se lleva la cuenta corriente de cada propietario y se le informa cuánto debe depositar.",
    puntos: [
      "Ingreso con email o con Google, y tres roles: administrador, operador y propietario, con permisos aplicados en la base de datos.",
      "Propietarios con foto, contactos, cuentas bancarias y ficha con solapas de datos, bienes y cuenta corriente.",
      "Bienes (inmuebles, terrenos, vehículos y otros) con titularidad por porcentajes, servicios e impuestos y su situación de deuda.",
      "Obligaciones con boleta adjunta, gastos recurrentes que se generan solos y ventana de fin de mes para completar los montos.",
      "Pagos con comprobante y anulación por contramovimiento: nada se borra.",
      "Cuenta corriente en pesos y dólares, con movimientos, traspaso con cotización y exportación a Excel.",
      "Resumen de depósito en PDF numerado, con envío por WhatsApp y plantillas editables.",
      "Auditoría de cambios, con opción de activarla o desactivarla en general o por propietario (el dinero siempre se audita).",
      "Modo claro y oscuro, menú contraíble, filtros que se aplican solos y diseño pensado para computadora y celular.",
      "App Android con ingreso y cuenta; la gestión completa está en la versión web.",
    ],
  },
];

export const VERSION_ACTUAL: string = VERSIONES[0]!.version;
