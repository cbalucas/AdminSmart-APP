const iniciales = (nombre: string) =>
  nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");

// Sin imagen, el avatar muestra las iniciales sobre un color fijo derivado del nombre (sección 12).
function tonoDe(nombre: string): number {
  let h = 0;
  for (const c of nombre) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

export function Avatar({ nombre, tamano = 36, url }: { nombre: string; tamano?: number; url?: string | null }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="avatar-color avatar-imagen" src={url} alt="" width={tamano} height={tamano} style={{ width: tamano, height: tamano }} />;
  }
  return (
    <span
      className="avatar-color"
      aria-hidden="true"
      style={{
        width: tamano,
        height: tamano,
        fontSize: Math.round(tamano * 0.38),
        background: `hsl(${tonoDe(nombre)} 38% 30%)`,
      }}
    >
      {iniciales(nombre)}
    </span>
  );
}
