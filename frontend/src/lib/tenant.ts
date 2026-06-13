/**
 * Resolução de tenant por subdomínio — espelha a regra do backend
 * (TenantInterceptor): `<slug>.<base-domain>` identifica a comunidade;
 * o domínio raiz (sem slug) serve o diretório público.
 *
 * Funções puras recebem o host explicitamente para servirem tanto no browser
 * (window.location.host) quanto em Server Components (headers().get("host")).
 */

export const BASE_DOMAIN =
  process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "quilombo.localhost";

/** Remove a porta de um host ("a.b:8080" → "a.b"). */
function hostname(host: string): string {
  return host.split(":")[0].toLowerCase();
}

/** Porta de um host ("a.b:8080" → ":8080"), vazio se não houver. */
function portSuffix(host: string): string {
  const idx = host.indexOf(":");
  return idx === -1 ? "" : host.slice(idx);
}

/**
 * Extrai o slug do tenant de um host, ou `null` no domínio raiz ou em hosts
 * fora do domínio base (ex.: localhost durante desenvolvimento).
 */
export function tenantSlugFromHost(host: string): string | null {
  const name = hostname(host);
  if (name === BASE_DOMAIN) {
    return null;
  }
  const suffix = `.${BASE_DOMAIN}`;
  if (!name.endsWith(suffix)) {
    return null;
  }
  const slug = name.slice(0, -suffix.length);
  // Slug com ponto seria um sub-subdomínio — não é um tenant válido.
  return slug && !slug.includes(".") ? slug : null;
}

/** Host (com porta) do subdomínio de uma comunidade, preservando a porta atual. */
export function tenantHost(slug: string, currentHost: string): string {
  return `${slug}.${BASE_DOMAIN}${portSuffix(currentHost)}`;
}

/** Host (com porta) do domínio raiz, preservando a porta atual. */
export function rootHost(currentHost: string): string {
  return `${BASE_DOMAIN}${portSuffix(currentHost)}`;
}

/** URL absoluta do subdomínio de uma comunidade (uso no browser). */
export function tenantUrl(slug: string): string {
  const { protocol, host } = window.location;
  return `${protocol}//${tenantHost(slug, host)}`;
}

/** URL absoluta do diretório público na raiz (uso no browser). */
export function rootUrl(): string {
  const { protocol, host } = window.location;
  return `${protocol}//${rootHost(host)}`;
}
