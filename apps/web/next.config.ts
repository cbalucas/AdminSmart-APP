import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Los paquetes compartidos se exportan como TypeScript sin compilar.
  transpilePackages: ["@ai/ui", "@ai/i18n", "@ai/domain"],
  // La generación de PDF corre en el servidor con su propio motor: no se empaqueta.
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
