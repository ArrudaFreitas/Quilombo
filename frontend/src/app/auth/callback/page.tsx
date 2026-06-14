import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { safeReturnTo } from '@/lib/auth/tenant'

/**
 * Callback do OAuth no **domínio raiz**: o backend sempre redireciona para
 * `https://{baseDomain}/auth/callback?code=` (sem o subdomínio), mas a troca do
 * código exige o tenant. Esta rota lê o tenant/destino dos cookies efêmeros
 * gravados no início do login e reencaminha para o callback do subdomínio, onde
 * a troca acontece com o Host correto. Protocolo e porta são preservados do
 * request (funciona em dev atrás do nginx e em produção).
 */
export default async function RootAuthCallback({
  searchParams,
}: {
  searchParams: Promise<{ code?: string | string[] }>
}) {
  const { code: rawCode } = await searchParams
  const code = Array.isArray(rawCode) ? rawCode[0] : rawCode

  const cookieStore = await cookies()
  const tenant = cookieStore.get('quilombo_login_tenant')?.value
  const returnTo = safeReturnTo(cookieStore.get('quilombo_login_return')?.value)
  const validTenant = tenant && /^[a-z0-9-]+$/.test(tenant) ? tenant : null

  // Sem contexto suficiente para concluir o login → volta ao diretório público.
  if (!code || !validTenant) {
    redirect('/')
  }

  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'quilombo.localhost'
  const headerList = await headers()
  const host = headerList.get('host') ?? baseDomain
  const port = host.includes(':') ? `:${host.split(':')[1]}` : ''
  const proto = headerList.get('x-forwarded-proto') ?? 'https'

  redirect(
    `${proto}://${validTenant}.${baseDomain}${port}/auth/callback` +
      `?code=${encodeURIComponent(code)}&returnTo=${encodeURIComponent(returnTo)}`,
  )
}
