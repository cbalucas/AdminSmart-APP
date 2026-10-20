"use client";

import { useEffect, useState } from "react";
import { t } from "@ai/i18n";

const CLAVE = "adminsmart-menu";

/** Contrae o despliega el menú lateral; recuerda la elección en este navegador. */
export function BotonMenu() {
  const [contraido, setContraido] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(CLAVE) === "contraido") setContraido(true);
    } catch {
      /* sin almacenamiento: el menú arranca desplegado */
    }
  }, []);

  useEffect(() => {
    const marco = document.querySelector(".marco");
    if (marco instanceof HTMLElement) marco.dataset.menu = contraido ? "contraido" : "desplegado";
  }, [contraido]);

  const alternar = () => {
    const nuevo = !contraido;
    setContraido(nuevo);
    try {
      localStorage.setItem(CLAVE, nuevo ? "contraido" : "desplegado");
    } catch {
      /* se ignora */
    }
  };

  const texto = t(contraido ? "menu.expandir" : "menu.contraer");
  return (
    <button type="button" className="boton-menu" onClick={alternar} aria-expanded={!contraido} aria-label={texto} title={texto}>
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  );
}
