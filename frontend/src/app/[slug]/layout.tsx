import { AuthProvider } from '@/components/auth/auth-provider'

/**
 * Layout do tenant (subdomínio `{slug}.dominio`, reescrito pelo proxy para
 * `/{slug}/...`). Envolve toda a subárvore da comunidade no `AuthProvider`, que
 * resolve a sessão a partir do refresh httpOnly. O `<html>`/`<body>` e o tema
 * vêm do layout raiz.
 */
export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return <AuthProvider slug={slug}>{children}</AuthProvider>
}
