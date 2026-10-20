import { defineConfig } from "vitest/config";

// RNF-05: cobertura mínima del 80 % en las reglas de negocio y contables.
export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/index.ts"],
      reporter: ["text-summary", "text"],
      thresholds: { lines: 80, statements: 80, functions: 80, branches: 70 },
    },
  },
});
