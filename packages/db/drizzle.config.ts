import { defineConfig } from "drizzle-kit";

// Solo genera el SQL a partir del esquema; no se conecta a la base.
export default defineConfig({
  dialect: "postgresql",
  schema: ["./src/comunes.ts", "./src/esquema-base.ts", "./src/esquema-operacion.ts", "./src/esquema-control.ts"],
  out: "./drizzle",
});
