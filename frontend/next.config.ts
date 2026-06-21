import type { NextConfig } from 'next'

const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'quilombo.ianarruda.dev'

// As imagens de comunidade vêm same-origin do MinIO via nginx (/quilombo-uploads/) e são
// renderizadas com `unoptimized` (o backend já entrega WebP dimensionado), então não passam
// pelo otimizador do Next — daí não há `images.remotePatterns` a configurar aqui.
const nextConfig: NextConfig = {
  allowedDevOrigins: [baseDomain, `*.${baseDomain}`],
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
        ],
      },
    ]
  },
}

export default nextConfig
