/**
 * URL absoluta do subdomínio de uma comunidade. A navegação entre o diretório
 * (domínio raiz) e a página da comunidade ({slug}.dominio) é cross-origin, então
 * precisa de URL absoluta. `host` inclui a porta (vem do header da requisição).
 */
export function communityUrl(
  slug: string,
  host: string,
  protocol = 'https'
): string {
  return `${protocol}://${slug}.${host}`
}
