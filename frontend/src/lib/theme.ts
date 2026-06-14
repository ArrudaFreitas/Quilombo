/**
 * Fonte de verdade do tema do PRODUTO (claro/escuro).
 *
 * A preferência é guardada num COOKIE no domínio-pai (`.{baseDomain}`), não em
 * localStorage: assim o tema é único em todo o produto — diretório (domínio
 * raiz) e todas as comunidades (subdomínios) compartilham a mesma escolha
 * (localStorage é isolado por origem, então cada subdomínio teria o seu). O
 * script anti-flash (themeInitScript) e o ThemeProvider leem/escrevem daqui a
 * mesma chave e regras, garantindo que SSR, primeiro paint e estado do React
 * nunca divirjam.
 */
export const THEME_COOKIE = 'quilombo-theme'

export const THEMES = ['light', 'dark'] as const
export type Theme = (typeof THEMES)[number]

export const DEFAULT_THEME: Theme = 'light'

/** Domínio-pai do cookie → compartilhado entre a raiz e os subdomínios. */
const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'quilombo.localhost'
/** Validade da preferência: 1 ano. */
const THEME_MAX_AGE = 60 * 60 * 24 * 365

export function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark'
}

/** Lê o tema do cookie compartilhado (cliente); `null` se ausente ou inválido. */
export function readThemeCookie(): Theme | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|;\s*)quilombo-theme=(light|dark)/)
  return match ? (match[1] as Theme) : null
}

/** Persiste o tema no cookie do domínio-pai (cliente). */
export function writeThemeCookie(theme: Theme): void {
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; domain=.${BASE_DOMAIN}; max-age=${THEME_MAX_AGE}; samesite=lax`
}

/**
 * Script síncrono injetado no <head> (ver components/theme-script.tsx).
 * Roda durante o parsing do HTML, ANTES do primeiro paint: lê a preferência do
 * COOKIE compartilhado (ou a do sistema) e aplica `data-theme` no <html>,
 * evitando flash de tema e hydration mismatch. Conteúdo 100% estático (sem
 * dados do usuário). Sob CSP estrito precisa do nonce — passado pelo root layout.
 */
export function themeInitScript(): string {
  return `(function(){try{var c=document.cookie.match(/(?:^|;\\s*)quilombo-theme=(light|dark)/);var m=window.matchMedia("(prefers-color-scheme: dark)").matches;var t=c?c[1]:(m?"dark":"light");document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`
}
