import Link from 'next/link'

/** Estado vazio: distingue "sem resultados de busca" de "diretório vazio". */
export function EmptyState({ query }: { query?: string }) {
  return (
    <div className="flex flex-col items-center px-4 py-20 text-center">
      <div className="text-primary/30 mb-5 text-6xl leading-none" aria-hidden="true">
        ◎
      </div>
      <p className="font-display text-fg text-2xl">
        Nenhuma comunidade encontrada
      </p>
      {query ? (
        <p className="text-fg-muted mt-2">
          Nada para “{query}”. Tente outro nome ou{' '}
          <Link
            href="/"
            className="text-primary font-semibold underline underline-offset-2"
          >
            limpe a busca
          </Link>
          .
        </p>
      ) : (
        <p className="text-fg-muted mt-2">
          Ainda não há comunidades publicadas no diretório.
        </p>
      )}
    </div>
  )
}
