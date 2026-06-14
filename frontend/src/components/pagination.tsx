import Link from 'next/link'

interface PaginationProps {
  query?: string
  /** Página atual (1-based). */
  page: number
  totalPages: number
}

function buildHref(query: string | undefined, page: number): string {
  const params = new URLSearchParams()
  if (query) params.set('q', query)
  if (page > 1) params.set('page', String(page))
  const qs = params.toString()
  return qs ? `/?${qs}` : '/'
}

/** Janela compacta de páginas: 1 … atual-1 atual atual+1 … total. */
function pageWindow(current: number, total: number): (number | 'gap')[] {
  const wanted = new Set([1, total, current, current - 1, current + 1])
  const sorted = [...wanted]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b)

  const result: (number | 'gap')[] = []
  let previous = 0
  for (const p of sorted) {
    if (p - previous > 1) result.push('gap')
    result.push(p)
    previous = p
  }
  return result
}

const CELL = 'inline-flex h-10 min-w-10 items-center justify-center rounded-md px-2 text-sm'

export function Pagination({ query, page, totalPages }: PaginationProps) {
  if (totalPages <= 1) return null

  const items = pageWindow(page, totalPages)

  return (
    <nav
      aria-label="Paginação"
      className="mt-12 flex items-center justify-center gap-1"
    >
      {page > 1 ? (
        <Link
          href={buildHref(query, page - 1)}
          rel="prev"
          aria-label="Página anterior"
          className={`${CELL} text-fg hover:bg-bg-subtle font-semibold`}
        >
          ‹
        </Link>
      ) : (
        <span className={`${CELL} text-fg-subtle cursor-not-allowed`} aria-hidden="true">
          ‹
        </span>
      )}

      {items.map((item, index) =>
        item === 'gap' ? (
          <span
            key={`gap-${index}`}
            className="text-fg-subtle px-1"
            aria-hidden="true"
          >
            …
          </span>
        ) : item === page ? (
          <span
            key={item}
            aria-current="page"
            className={`${CELL} bg-primary text-on-primary font-bold`}
          >
            {item}
          </span>
        ) : (
          <Link
            key={item}
            href={buildHref(query, item)}
            aria-label={`Página ${item}`}
            className={`${CELL} text-fg hover:bg-bg-subtle font-semibold`}
          >
            {item}
          </Link>
        )
      )}

      {page < totalPages ? (
        <Link
          href={buildHref(query, page + 1)}
          rel="next"
          aria-label="Próxima página"
          className={`${CELL} text-fg hover:bg-bg-subtle font-semibold`}
        >
          ›
        </Link>
      ) : (
        <span className={`${CELL} text-fg-subtle cursor-not-allowed`} aria-hidden="true">
          ›
        </span>
      )}
    </nav>
  )
}
