"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { t } from "@ai/i18n";
import type { ItemMenu } from "@/lib/menu";
import { Icono } from "./Iconos";

const PASO = 160;

export function MenuLateral({ items }: { items: ItemMenu[] }) {
  const ruta = usePathname();
  const lista = useRef<HTMLElement>(null);
  const [puedeSubir, setPuedeSubir] = useState(false);
  const [puedeBajar, setPuedeBajar] = useState(false);

  // Las flechas aparecen solo cuando el menú no entra completo en la altura de la pantalla.
  const medir = useCallback(() => {
    const el = lista.current;
    if (!el) return;
    setPuedeSubir(el.scrollTop > 2);
    setPuedeBajar(el.scrollTop + el.clientHeight < el.scrollHeight - 2);
  }, []);

  useEffect(() => {
    medir();
    const el = lista.current;
    if (!el) return;
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    window.addEventListener("resize", medir);
    return () => {
      observador.disconnect();
      window.removeEventListener("resize", medir);
    };
  }, [medir]);

  const mover = (delta: number) => lista.current?.scrollBy({ top: delta, behavior: "smooth" });

  return (
    <div className="menu-zona">
      <button type="button" className="menu-flecha" onClick={() => mover(-PASO)} hidden={!puedeSubir} aria-label={t("menu.subir")} title={t("menu.subir")}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 15l6-6 6 6" /></svg>
      </button>
      <nav ref={lista} onScroll={medir} aria-label={t("menu.etiqueta")} className="menu-items">
        {items.map((item) => {
          const activo = ruta === item.ruta || ruta.startsWith(`${item.ruta}/`);
          return (
            <Link
              key={item.ruta}
              href={item.ruta}
              className={activo ? "menu-item activo" : "menu-item"}
              aria-current={activo ? "page" : undefined}
              title={t(`menu.${item.clave}`)}
            >
              <Icono nombre={item.icono} />
              <span>{t(`menu.${item.clave}`)}</span>
            </Link>
          );
        })}
      </nav>
      <button type="button" className="menu-flecha" onClick={() => mover(PASO)} hidden={!puedeBajar} aria-label={t("menu.bajar")} title={t("menu.bajar")}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
      </button>
    </div>
  );
}
