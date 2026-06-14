'use client'

/**
 * Error boundary da subárvore do tenant: captura falhas inesperadas de render
 * (fora do tratamento próprio do login/callback) e oferece retry.
 */
export default function TenantError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="container-page flex min-h-dvh flex-col items-center justify-center py-12 text-center"
    >
      <div
        className="text-danger mb-5 text-6xl leading-none"
        aria-hidden="true"
      >
        ⚠
      </div>
      <h1 className="font-display text-fg text-3xl">Algo deu errado</h1>
      <p className="text-fg-muted mt-3 max-w-md text-balance">
        Houve uma falha inesperada. Tente novamente.
      </p>
      <button type="button" onClick={reset} className="btn btn-primary mt-8">
        Tentar novamente
      </button>
    </main>
  )
}
