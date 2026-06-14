/**
 * Resolução de tenant no frontend. Espelha o backend
 * (`TenantInterceptor.slugFromHost`): o tenant é o subdomínio de um nível do
 * domínio base. Raiz (`quilombo.localhost`) ou host fora do domínio base → sem
 * tenant. A porta é ignorada.
 */
export function tenantFromHost(
  host: string | null | undefined,
  baseDomain: string,
): string | null {
  if (!host) return null
  const normalized = host.toLowerCase().replace(/:\d+$/, '')
  const suffix = `.${baseDomain}`
  if (normalized === baseDomain || !normalized.endsWith(suffix)) return null
  const slug = normalized.slice(0, -suffix.length)
  // só um nível de subdomínio (sem `a.b.quilombo.localhost`)
  return slug && !slug.includes('.') ? slug : null
}

/**
 * Garante que um destino de redirecionamento é um caminho interno (mesma
 * origem), evitando open redirect. Aceita só caminhos absolutos de raiz e
 * bloqueia `//host`, esquemas (`javascript:`) e barras invertidas.
 */
export function safeReturnTo(
  value: string | null | undefined,
  fallback = '/admin',
): string {
  if (!value || !value.startsWith('/')) return fallback
  if (value.startsWith('//') || value.includes('\\')) return fallback
  return value
}
