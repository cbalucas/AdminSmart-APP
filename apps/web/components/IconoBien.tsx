import { Icono } from "@/components/Iconos";

const ICONO_POR_TIPO: Record<string, string> = { inmueble: "bienes", terreno: "terreno", vehiculo: "vehiculo", otros: "otros" };

/** Ícono redondo según el tipo de bien (inmueble, terreno, vehículo u otros), como en los prototipos. */
export function IconoBien({ tipo }: { tipo: string }) {
  return (
    <span className="icono-bien" aria-hidden="true">
      <Icono nombre={ICONO_POR_TIPO[tipo] ?? "otros"} tamano={18} />
    </span>
  );
}
