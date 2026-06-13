'use client'

/**
 * Error boundary da rota: captura falhas de rede / respostas inesperadas da API
 * (ApiError, ZodError) lançadas durante o render no servidor e oferece retry.
 */
export default function DirectoryError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="container-page flex flex-col items-center py-24 text-center">
      <div className="text-danger mb-5 text-6xl leading-none" aria-hidden="true">
        ⚠
      </div>
      <h1 className="font-display text-fg text-3xl">
        Não foi possível carregar o diretório
      </h1>
      <p className="text-fg-muted mt-3 max-w-md">
        Houve uma falha ao buscar as comunidades. Verifique sua conexão e tente
        novamente.
      </p>
      <button type="button" onClick={reset} className="btn btn-primary mt-8">
        Tentar novamente
      </button>
    </main>
  )
}
