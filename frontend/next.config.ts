import type { NextConfig } from 'next'

const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'quilombo.ianarruda.dev'
const storageHost = process.env.NEXT_PUBLIC_STORAGE_URL
  ? new URL(process.env.NEXT_PUBLIC_STORAGE_URL).hostname
  : 'localhost'

const nextConfig: NextConfig = {
  allowedDevOrigins: [baseDomain, `*.${baseDomain}`],

  images: {
    remotePatterns: [
      { protocol: 'http', hostname: storageHost, port: '9000' },
      { protocol: 'https', hostname: `**.${baseDomain}` },
    ],
  },

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
        ],
      },
    ]
  },
}

export default nextConfig
