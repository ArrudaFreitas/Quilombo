import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

interface LoginPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ returnTo?: string | string[] }>
}

/**
 * O login é centralizado no ápice (uma única origem registrada no Google). Esta rota de
 * subdomínio apenas reencaminha para `https://{baseDomain}/login`, levando como `returnTo`
 * a URL absoluta de volta a este tenant. Protocolo e porta vêm do request (dev atrás do nginx
 * e produção). Após autenticar no ápice, o usuário volta e a sessão da comunidade é cunhada.
 */
export default async function TenantLoginRedirect({
  params,
  searchParams,
}: LoginPageProps) {
  const { slug } = await params
  const { returnTo: rawReturnTo } = await searchParams
  const rawDest = Array.isArray(rawReturnTo) ? rawReturnTo[0] : rawReturnTo

  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'quilombo.localhost'
  const headerList = await headers()
  const host = headerList.get('host') ?? baseDomain
  const port = host.includes(':') ? `:${host.split(':')[1]}` : ''
  const proto = headerList.get('x-forwarded-proto') ?? 'https'

  // destino após o login: a página pedida (caminho interno) ou o admin do tenant
  const dest = rawDest && rawDest.startsWith('/') ? rawDest : '/admin'
  const tenantUrl = `${proto}://${slug}.${baseDomain}${port}${dest}`

  redirect(
    `${proto}://${baseDomain}${port}/login?returnTo=${encodeURIComponent(tenantUrl)}`,
  )
}
