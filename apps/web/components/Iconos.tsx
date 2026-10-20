// Íconos de trazo simple (24×24) que heredan el color del texto.
const TRAZOS: Record<string, string> = {
  inicio: "M3 11l9-8 9 8M5 10v10h14V10M10 20v-6h4v6",
  propietarios: "M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M21 19v-1a4 4 0 0 0-3-3.9M15 3.2a3.5 3.5 0 0 1 0 6.6",
  bienes: "M4 21V8l8-5 8 5v13M9 21v-6h6v6M9 11h.01M15 11h.01",
  edificios: "M5 21V4h9v17M14 9h5v12M3 21h18M8 8h2M8 12h2M8 16h2",
  inquilinos: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M5 21a7 7 0 0 1 14 0",
  contratos: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h6",
  obligaciones: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  cuentas: "M3 7a2 2 0 0 1 2-2h14v4M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3M17 14h4v-4h-4a2 2 0 0 0 0 4",
  liquidaciones: "M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6",
  reportes: "M4 20V10M10 20V4M16 20v-8M22 20H2",
  terreno: "M3 20l6-11 4 6 3-4 5 9zM17 6.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3",
  vehiculo: "M3 17v-4l2-6h14l2 6v4M3 17h18M3 17v2h3v-2M18 17v2h3v-2M6 13h.01M18 13h.01",
  otros: "M3 8h18v12H3zM8 8V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3M3 13h18",
  recurrente: "M21 12a9 9 0 0 0-15.5-6.2L3 8M3 3v5h5M3 12a9 9 0 0 0 15.5 6.2L21 16M21 21v-5h-5",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 11v5M12 8h.01",
  persona: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M5 21a7 7 0 0 1 14 0",
  guardar: "M5 12.5l4.5 4.5L19 7.5",
  cancelar: "M6 6l12 12M18 6L6 18",
  mas: "M12 5v14M5 12h14",
  quitar: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  editar: "M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4",
  mail: "M3 6h18v12H3zM3 7l9 7 9-7",
  telefono: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2",
  calendario: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  dinero: "M12 3v18M16 7.5c0-1.7-1.8-3-4-3s-4 1.3-4 3 1.8 2.5 4 3 4 1.3 4 3-1.8 3-4 3-4-1.3-4-3",
  ubicacion: "M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5",
  numero: "M5 9h14M5 15h14M10 3L8 21M16 3l-2 18",
  porcentaje: "M19 5L5 19M7 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4M17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4",
  nota: "M5 4h14v16H5zM9 9h6M9 13h6M9 17h3",
  ojo: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6",
  volver: "M19 12H5M11 6l-6 6 6 6",
  desactivar: "M12 3v9M6.3 6.3a8 8 0 1 0 11.4 0",
  reactivar: "M7 4l13 8-13 8z",
  documento: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5",
  auditoria: "M12 3l8 3v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6zM9 12l2 2 4-4",
  configuracion: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1L7 17M17 7l2.1-2.1",
  buscar: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16M21 21l-4.3-4.3",
  luna: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8",
  sol: "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4",
  campana: "M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0",
  camara: "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
  salir: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
};

export function Icono({ nombre, tamano = 18 }: { nombre: string; tamano?: number }) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={TRAZOS[nombre] ?? ""} />
    </svg>
  );
}
