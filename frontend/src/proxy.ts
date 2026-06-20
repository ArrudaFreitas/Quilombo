import { NextRequest, NextResponse } from 'next/server'

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const isDev = process.env.NODE_ENV === 'development'

  // Google Identity Services (login admin): o script vem de gsi/client, o botão
  // injeta a folha de estilo gsi/style no nosso documento (style-src), renderiza
  // num iframe de gsi/ (frame-src) e a lib chama os endpoints de gsi/ (connect-src).
  const gsi = 'https://accounts.google.com/gsi/'

  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${gsi}client${isDev ? " 'unsafe-eval'" : ''};
    style-src 'self' ${gsi}${isDev ? " 'unsafe-inline'" : ` 'nonce-${nonce}'`};
    img-src 'self' blob: data:;
    font-src 'self';
    connect-src 'self' ${gsi}${isDev ? ' ws://localhost:* wss://localhost:*' : ''};
    frame-src ${gsi};
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `
    .replace(/\s{2,}/g, ' ')
    .trim()

  const baseDomain =
    process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'quilombo.ianarruda.dev'
  const host = (request.headers.get('host') ?? '').replace(/:\d+$/, '')

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', cspHeader)

  if (host !== baseDomain && host.endsWith(`.${baseDomain}`)) {
    const slug = host.slice(0, -(`.${baseDomain}`.length))
    const url = request.nextUrl.clone()
    url.pathname = `/${slug}${url.pathname}`
    const rewriteResponse = NextResponse.rewrite(url, {
      request: { headers: requestHeaders },
    })
    rewriteResponse.headers.set('Content-Security-Policy', cspHeader)
    return rewriteResponse
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('Content-Security-Policy', cspHeader)
  return response
}

export const config = {
  matcher: [
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
