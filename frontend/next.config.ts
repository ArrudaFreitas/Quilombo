import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build autocontido (node_modules mínimos) para a imagem Docker de produção.
  output: "standalone",

  // Em dev o app é servido pelo nginx em quilombo.localhost e subdomínios;
  // sem isso o dev server bloqueia os assets como cross-origin.
  allowedDevOrigins: ["quilombo.localhost", "*.quilombo.localhost"],
};

export default nextConfig;
