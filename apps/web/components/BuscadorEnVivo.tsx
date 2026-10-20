"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";

/**
 * Campo de búsqueda reactivo: a medida que se escribe, actualiza la dirección (parámetro `name`)
 * y la pantalla vuelve a filtrar con "contiene". Conserva los demás filtros que ya estén aplicados.
 */
export function BuscadorEnVivo({ name = "q", defaultValue = "", placeholder, ariaLabel }: { name?: string; defaultValue?: string; placeholder: string; ariaLabel: string }) {
  const router = useRouter();
  const ruta = usePathname();
  const parametros = useSearchParams();
  const [, iniciar] = useTransition();
  const demora = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (demora.current) clearTimeout(demora.current);
  }, []);

  function alEscribir(valor: string) {
    if (demora.current) clearTimeout(demora.current);
    demora.current = setTimeout(() => {
      const nuevos = new URLSearchParams(parametros.toString());
      if (valor.trim()) nuevos.set(name, valor);
      else nuevos.delete(name);
      const texto = nuevos.toString();
      iniciar(() => router.replace(texto ? `${ruta}?${texto}` : ruta, { scroll: false }));
    }, 200);
  }

  return (
    <input
      type="search"
      name={name}
      defaultValue={defaultValue}
      placeholder={placeholder}
      aria-label={ariaLabel}
      autoComplete="off"
      onChange={(e) => alEscribir(e.target.value)}
    />
  );
}
