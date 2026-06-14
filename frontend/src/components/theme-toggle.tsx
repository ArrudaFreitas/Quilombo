'use client'

import { useTheme } from './theme-provider'

/**
 * Alterna o tema do produto (claro/escuro). Vive no root layout, então está
 * presente em todas as telas; a preferência é global (data-theme no <html> +
 * localStorage via ThemeProvider).
 *
 * O ícone é dirigido por CSS (variante `dark:` = [data-theme="dark"]), não por
 * estado React — assim não há flash nem hydration mismatch (o data-theme já foi
 * aplicado pelo script anti-flash antes do primeiro paint).
 */
export function ThemeToggle() {
  const { toggleTheme } = useTheme()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Alternar tema claro e escuro"
      title="Alternar tema"
      className="btn-icon absolute top-4 right-4 z-40 rounded-full shadow-sm flex items-center justify-center"
    >
      {/* Lua — visível no tema claro (ação: escurecer) */}
      <svg
        className="size-5 dark:hidden"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
      {/* Sol — visível no tema escuro (ação: clarear) */}
      <svg
        className="hidden size-5 dark:block"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
    </button>
  )
}
