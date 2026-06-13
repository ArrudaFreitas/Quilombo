export function SkipLink() {
  // WCAG 2.4.1 — visível ao receber foco (Tab). Foco visível vem da base global.
  return (
    <a
      href="#main-content"
      className="sr-only rounded-md focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-surface-raised focus:text-fg focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-md"
    >
      Pular para o conteúdo principal
    </a>
  )
}
