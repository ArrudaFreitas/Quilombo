/**
 * Estado de espera acessível (carregando / autenticando / redirecionando).
 * Reusado pela rota de callback e pelo `AuthGuard`. Anuncia o progresso a
 * leitores de tela (`role="status"` + `aria-live`).
 */
export function AuthPending({ label = 'Carregando…' }: { label?: string }) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="container-page flex min-h-dvh flex-col items-center justify-center gap-4 py-12 text-center"
    >
      <span
        className="border-primary size-8 animate-spin rounded-full border-2 border-t-transparent"
        aria-hidden="true"
      />
      <p role="status" aria-live="polite" className="text-fg-muted">
        {label}
      </p>
    </main>
  )
}
