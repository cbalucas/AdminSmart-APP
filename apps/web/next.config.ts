import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Los paquetes compartidos se exportan como TypeScript sin compilar.
  transpilePackages: ["@ai/ui", "@ai/i18n", "@ai/domain"],
};

export default nextConfig;
