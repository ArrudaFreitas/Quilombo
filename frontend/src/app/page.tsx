import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { Suspense } from 'react'
import { CommunityCard } from '@/components/community-card'
import { CommunityGridSkeleton } from '@/components/community-card-skeleton'
import { EmptyState } from '@/components/empty-state'
import { Pagination } from '@/components/pagination'
import { SearchField } from '@/components/search-field'
import { DEFAULT_PAGE_SIZE, getCommunities } from '@/lib/api/communities'
import { communityUrl } from '@/lib/community-url'

export const metadata: Metadata = {
  title: 'Diretório de Comunidades',
  description:
    'Explore comunidades quilombolas de todo o Brasil e conheça suas histórias, territórios e cultura.',
}

interface DirectoryPageProps {
  searchParams: Promise<{ q?: string | string[]; page?: string | string[] }>
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function parsePage(value: string | undefined): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1
}

export default async function DirectoryPage({
  searchParams,
}: DirectoryPageProps) {
  const params = await searchParams
  const query = firstValue(params.q)?.trim() || undefined
  const page = parsePage(firstValue(params.page))

  return (
    <main id="main-content" tabIndex={-1} className="container-page py-10 md:py-16">
      <header className="mx-auto mb-10 max-w-2xl text-center md:mb-14">
        <p className="text-fg-muted mb-4 inline-flex items-center gap-2 text-sm font-bold tracking-[0.14em] uppercase">
          <span
            className="bg-accent inline-block size-2 rounded-full"
            aria-hidden="true"
          />
          Plataforma quilombola
        </p>
        <h1 className="font-display text-fg text-4xl leading-[1.05] font-semibold md:text-6xl">
          Quilombos <em className="text-primary">do Brasil</em>
        </h1>
        <p className="text-fg-muted mx-auto mt-5 max-w-prose text-lg text-balance">
          Conheça as comunidades que preservam a cultura e a história
          afro-brasileira.
        </p>
        <div className="mx-auto mt-8 max-w-xl">
          <SearchField defaultValue={query ?? ''} />
        </div>
      </header>

      <Suspense
        key={`${query ?? ''}-${page}`}
        fallback={<CommunityGridSkeleton count={6} />}
      >
        <Results query={query} page={page} />
      </Suspense>
    </main>
  )
}

async function Results({ query, page }: { query?: string; page: number }) {
  const headerList = await headers()
  const host =
    headerList.get('host') ??
    process.env.NEXT_PUBLIC_BASE_DOMAIN ??
    'quilombo.ianarruda.dev'
  const protocol = headerList.get('x-forwarded-proto') ?? 'https'

  const { items, page: info } = await getCommunities({
    query,
    page,
    size: DEFAULT_PAGE_SIZE,
  })
  const total = info.totalElements

  return (
    <section aria-labelledby="results-heading">
      <h2 id="results-heading" className="sr-only">
        Comunidades
      </h2>
      <p aria-live="polite" className="text-fg-subtle mb-6 text-sm">
        {total}{' '}
        {total === 1 ? 'comunidade encontrada' : 'comunidades encontradas'}
        {query ? ` para “${query}”` : ''}
      </p>

      {items.length === 0 ? (
        <EmptyState query={query} />
      ) : (
        <ul className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {items.map((community) => (
            <CommunityCard
              key={community.slug}
              community={community}
              href={communityUrl(community.slug, host, protocol)}
            />
          ))}
        </ul>
      )}

      <Pagination
        query={query}
        page={info.number + 1}
        totalPages={info.totalPages}
      />
    </section>
  )
}
