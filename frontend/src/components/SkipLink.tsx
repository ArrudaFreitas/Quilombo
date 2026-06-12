/**
 * Link "pular para o conteúdo" (WCAG 2.4.1 — Bypass Blocks).
 *
 * Fica visualmente oculto até receber foco via teclado. Convenção do projeto:
 * toda página define o landmark principal como `<main id="conteudo">`.
 */
export function SkipLink() {
  return (
    <a
      href="#conteudo"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-theme-sm focus:bg-surface-raised focus:px-4 focus:py-3 focus:font-bold focus:text-foreground focus:shadow-theme-sm"
    >
      Pular para o conteúdo principal
    </a>
  );
}
