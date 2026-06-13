import { themeInitScript } from '@/lib/theme'

/**
 * Script anti-flash de tema. Renderizado no <head> pelo root layout.
 * O `nonce` (lido do header x-nonce no layout) é obrigatório sob o CSP estrito
 * do app (style-src/script-src 'self' 'nonce-…') — sem ele o script é bloqueado.
 */
export function ThemeScript({ nonce }: { nonce?: string }) {
  return (
    <script
      nonce={nonce}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: themeInitScript() }}
    />
  )
}
