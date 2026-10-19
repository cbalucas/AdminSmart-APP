"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { t } from "@ai/i18n";
import type { ItemMenu } from "@/lib/menu";
import { Icono } from "./Iconos";

export function MenuLateral({ items }: { items: ItemMenu[] }) {
  const ruta = usePathname();
  return (
    <nav aria-label={t("menu.etiqueta")} className="menu-items">
      {items.map((item) => {
        const activo = ruta === item.ruta || ruta.startsWith(`${item.ruta}/`);
        return (
          <Link
            key={item.ruta}
            href={item.ruta}
            className={activo ? "menu-item activo" : "menu-item"}
            aria-current={activo ? "page" : undefined}
          >
            <Icono nombre={item.icono} />
            <span>{t(`menu.${item.clave}`)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
