/**
 * Fonte de verdade do tema do PRODUTO (claro/escuro).
 * O script anti-flash (themeInitScript) e o ThemeProvider compartilham daqui
 * a chave de storage e os valores válidos, garantindo que SSR, primeiro paint
 * e estado do React nunca divirjam.
 */
export const THEME_STORAGE_KEY = 'quilombo-theme'

export const THEMES = ['light', 'dark'] as const
export type Theme = (typeof THEMES)[number]

export const DEFAULT_THEME: Theme = 'light'

export function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark'
}

/**
 * Script síncrono injetado no <head> (ver components/theme-script.tsx).
 * Roda durante o parsing do HTML, ANTES do primeiro paint: lê a preferência
 * salva (ou a do sistema) e aplica `data-theme` no <html>, evitando flash de
 * tema e hydration mismatch. Conteúdo 100% estático (sem dados do usuário).
 * Sob CSP estrito precisa do nonce — passado pelo root layout.
 */
export function themeInitScript(): string {
  return `(function(){try{var k=${JSON.stringify(
    THEME_STORAGE_KEY
  )};var s=localStorage.getItem(k);var m=window.matchMedia("(prefers-color-scheme: dark)").matches;var t=(s==="light"||s==="dark")?s:(m?"dark":"light");document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`
}
