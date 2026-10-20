"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useTransition, type FormEvent, type ReactNode } from "react";

/**
 * Formulario de filtros que se aplica solo: al escribir en el buscador (con una pequeña demora) o al cambiar
 * una lista, una casilla o una fecha, actualiza la dirección y la pantalla vuelve a filtrar. Conserva los
 * parámetros que no son campos del formulario (por ejemplo, el estado elegido en las pestañas).
 */
export function FormularioEnVivo({ className, children }: { className?: string; children: ReactNode }) {
  const router = useRouter();
  const ruta = usePathname();
  const parametros = useSearchParams();
  const [, iniciar] = useTransition();
  const formulario = useRef<HTMLFormElement>(null);
  const demora = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (demora.current) clearTimeout(demora.current);
  }, []);

  function aplicar() {
    const el = formulario.current;
    if (!el) return;
    const controlados = new Set(Array.from(el.elements).map((x) => (x as HTMLInputElement).name).filter(Boolean));
    const nuevos = new URLSearchParams();
    for (const [k, v] of parametros) if (!controlados.has(k) && k !== "pagina") nuevos.set(k, v);
    for (const [k, v] of new FormData(el)) if (typeof v === "string" && v.trim() !== "") nuevos.set(k, v);
    const texto = nuevos.toString();
    iniciar(() => router.replace(texto ? `${ruta}?${texto}` : ruta, { scroll: false }));
  }

  function alCambiar(e: FormEvent<HTMLFormElement>) {
    const el = e.target as HTMLElement;
    const inmediato = el instanceof HTMLSelectElement || (el instanceof HTMLInputElement && ["checkbox", "radio", "date"].includes(el.type));
    if (demora.current) clearTimeout(demora.current);
    if (inmediato) aplicar();
    else demora.current = setTimeout(aplicar, 250);
  }

  return (
    <form
      ref={formulario}
      className={className}
      role="search"
      onChange={alCambiar}
      onSubmit={(e) => {
        e.preventDefault();
        if (demora.current) clearTimeout(demora.current);
        aplicar();
      }}
    >
      {children}
    </form>
  );
}
