import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

// CLAUDE.md regla 7: ningún texto visible se escribe dentro de una pantalla; todo va en es-AR.json con una clave.
// Estas pruebas evitan dos errores que ya ocurrieron: usar una clave que no existe (se vería la clave en pantalla)
// y repetir una clave en el archivo de textos.
const RAIZ = resolve(__dirname, "../../..");
const ARCHIVO = join(RAIZ, "packages/i18n/src/es-AR.json");
const crudo = readFileSync(ARCHIVO, "utf8");
const textos = JSON.parse(crudo) as Record<string, string>;
const claves = Object.keys(textos);
const prefijos = new Set(claves.map((c) => c.split(".")[0] as string));

function archivos(dir: string, salida: string[] = []): string[] {
  for (const nombre of readdirSync(dir)) {
    if (["node_modules", ".next", ".expo", "dist", ".turbo"].includes(nombre)) continue;
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) archivos(ruta, salida);
    else if (/\.(ts|tsx)$/.test(nombre) && !/\.test\.tsx?$/.test(nombre) && !nombre.endsWith(".d.ts")) salida.push(ruta);
  }
  return salida;
}

const fuentes = ["apps/web/app", "apps/web/components", "apps/web/lib", "apps/mobile/src", "packages/domain/src", "packages/ui/src"]
  .map((d) => join(RAIZ, d))
  .flatMap((d) => {
    try {
      return archivos(d);
    } catch {
      return [];
    }
  });

describe("Textos del sistema", () => {
  it("hay archivos de código para revisar", () => {
    expect(fuentes.length).toBeGreaterThan(50);
  });

  it("cada clave de es-AR.json aparece una sola vez", () => {
    const vistas = [...crudo.matchAll(/^\s*"([^"]+)"\s*:/gm)].map((m) => m[1] as string);
    const repetidas = vistas.filter((c, i) => vistas.indexOf(c) !== i);
    expect(repetidas).toEqual([]);
  });

  it("ninguna clave usada en el código falta en es-AR.json", () => {
    const faltan: string[] = [];
    for (const archivo of fuentes) {
      const codigo = readFileSync(archivo, "utf8");
      // Claves escritas como texto literal ("obligaciones.estado_a_completar"): llamadas a t() y mensajes de error.
      for (const m of codigo.matchAll(/["']([a-z_]+(?:\.[a-z0-9_]+)+)["']/g)) {
        const clave = m[1] as string;
        if (!prefijos.has(clave.split(".")[0] as string)) continue;
        // Un prefijo que termina en "_" (por ejemplo "pagos.medio_") se completa en tiempo de ejecución: alcanza con que exista alguna clave que lo use.
        if (clave.endsWith("_") ? !claves.some((k) => k.startsWith(clave)) : !(clave in textos)) faltan.push(`${clave}  (${archivo.replace(RAIZ, "").split("\\").join("/")})`);
      }
    }
    expect([...new Set(faltan)]).toEqual([]);
  });

  it("ningún texto está vacío", () => {
    expect(claves.filter((c) => (textos[c] as string).trim() === "")).toEqual([]);
  });
});
