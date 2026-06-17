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

/**
 * Valida um destino que pode ser uma **URL absoluta de outro subdomínio** — o login
 * é centralizado no ápice e volta para o subdomínio do tenant. Aceita http(s) cujo host
 * seja o domínio base ou um subdomínio dele (mesmo site), ou um caminho interno de raiz;
 * qualquer outra coisa cai no ápice (`/`), evitando open redirect.
 */
export function safeReturnUrl(
  value: string | null | undefined,
  baseDomain: string,
): string {
  if (!value) return '/'
  if (value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')) {
    return value
  }
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return '/'
    const host = url.hostname.toLowerCase()
    if (host === baseDomain || host.endsWith(`.${baseDomain}`)) {
      return url.toString()
    }
  } catch {
    /* não é uma URL válida */
  }
  return '/'
}
