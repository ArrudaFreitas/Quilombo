import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Em dev o app é servido pelo nginx em quilombo.localhost e subdomínios;
  // sem isso o dev server bloqueia os assets como cross-origin.
  allowedDevOrigins: ["quilombo.localhost", "*.quilombo.localhost"],

  images: {
    remotePatterns: [
      // MinIO em dev (MINIO_PUBLIC_URL do docker-compose).
      { protocol: "http", hostname: "localhost", port: "9000" },
      // Bucket público em produção/homolog atrás do domínio base.
      { protocol: "https", hostname: "**.quilombo.localhost" },
    ],
  },
};

export default nextConfig;
