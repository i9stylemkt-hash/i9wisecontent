import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Desabilitar Turbopack no build (instável em produção)
  // Suprimir avisos de middleware depreciado no Next.js 16
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
