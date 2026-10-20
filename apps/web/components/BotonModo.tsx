"use client";

import { useEffect, useState } from "react";
import { t } from "@ai/i18n";
import { Icono } from "./Iconos";

type Modo = "claro" | "oscuro";

// Cambia entre modo claro y oscuro (sección 12). La elección se recuerda en este navegador;
// guardarla por usuario llega con Mi cuenta (P-46).
export function BotonModo() {
  const [modo, setModo] = useState<Modo | null>(null);

  useEffect(() => {
    // El tema lo fija un script antes de dibujar: solo se puede leer en el cliente, así que no hay otra forma de saberlo.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setModo(document.documentElement.dataset.tema === "oscuro" ? "oscuro" : "claro");
  }, []);

  function alternar() {
    const nuevo: Modo = modo === "oscuro" ? "claro" : "oscuro";
    document.documentElement.dataset.tema = nuevo;
    try {
      localStorage.setItem("tema", nuevo);
    } catch {
      // Sin almacenamiento disponible: el cambio vale solo para esta visita.
    }
    setModo(nuevo);
  }

  const etiqueta = modo === "oscuro" ? t("barra.modo_claro") : t("barra.modo_oscuro");
  return (
    <button type="button" className="boton-icono" onClick={alternar} aria-label={etiqueta} title={etiqueta}>
      <Icono nombre={modo === "oscuro" ? "sol" : "luna"} />
    </button>
  );
}
