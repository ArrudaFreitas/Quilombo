'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { CommunityImage } from '@/components/community-image'
import { ApiError } from '@/lib/api/client'
import { getCommunityPage, type CommunityPage } from '@/lib/api/community-page'

type State =
  | { status: 'loading' }
  | { status: 'ready'; page: CommunityPage }
  | { status: 'not-found' }
  | { status: 'error' }

/**
 * Home pública de uma comunidade. Busca a página institucional no browser
 * (same-origin via nginx → o backend resolve o tenant pelo subdomínio) e
 * renderiza a identidade da comunidade. Slug inexistente (404) e demais erros
 * têm estados próprios; o conteúdo institucional completo é de uma etapa futura.
 */
export function CommunityHome() {
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const page = await getCommunityPage()
        if (active) setState({ status: 'ready', page })
      } catch (err) {
        if (!active) return
        setState(
          err instanceof ApiError && err.status === 404
            ? { status: 'not-found' }
            : { status: 'error' },
        )
      }
    })()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (state.status === 'ready') {
      document.title = `${state.page.community.name} — Comunidade Quilombola`
    }
  }, [state])

  if (state.status === 'loading') return <CommunityHomeSkeleton />
  if (state.status === 'not-found') {
    return (
      <Centered
        title="Comunidade não encontrada"
        message="Esta comunidade não existe ou foi removida."
      />
    )
  }
  if (state.status === 'error') {
    return (
      <Centered
        title="Não foi possível carregar"
        message="Houve um erro ao carregar esta comunidade. Tente novamente em instantes."
      />
    )
  }

  const { community, card } = state.page

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="container-page py-12 md:py-16"
    >
      <article className="mx-auto max-w-3xl">
        <p className="text-primary mb-3 inline-flex items-center gap-1.5 text-sm font-bold tracking-wider uppercase">
          <PinIcon />
          <span>{community.location}</span>
        </p>

        <h1 className="font-display text-fg text-4xl leading-[1.05] font-semibold md:text-6xl">
          {community.name}
        </h1>

        {card?.shortDescription ? (
          <p className="text-fg-muted mt-5 max-w-prose text-lg text-balance">
            {card.shortDescription}
          </p>
        ) : null}

        <div className="bg-bg-subtle relative mt-8 aspect-[16/9] overflow-hidden rounded-2xl">
          <CommunityImage
            src={card?.imageUrl ?? null}
            name={community.name}
            slug={community.slug}
            alt={card?.imageAltText ?? ''}
          />
        </div>

        <section className="surface mt-10 rounded-2xl p-6 md:p-8">
          <span className="badge">Em construção</span>
          <h2 className="font-display text-fg mt-3 text-2xl font-semibold">
            A página desta comunidade está sendo preparada
          </h2>
          <p className="text-fg-muted mt-2 text-balance">
            Em breve, {community.name} terá aqui sua história, território e
            cultura.
          </p>
        </section>

        <p className="text-fg-subtle mt-10 text-sm">
          É administrador desta comunidade?{' '}
          <Link
            href="/admin"
            className="text-primary font-semibold underline-offset-4 hover:underline"
          >
            Acessar o painel
          </Link>
          .
        </p>
      </article>
    </main>
  )
}

/** Mensagem centralizada (404/erro), com retorno ao diretório no ápice. */
function Centered({ title, message }: { title: string; message: string }) {
  const baseDomain =
    process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'quilombo.ianarruda.dev'
  const apexHref =
    typeof window !== 'undefined'
      ? `${window.location.protocol}//${baseDomain}${
          window.location.port ? `:${window.location.port}` : ''
        }/`
      : '/'

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="container-page flex min-h-[60dvh] flex-col items-center justify-center py-16 text-center"
    >
      <h1 className="font-display text-fg text-3xl font-semibold">{title}</h1>
      <p role="alert" className="text-fg-muted mt-3 max-w-md text-balance">
        {message}
      </p>
      <a href={apexHref} className="btn btn-primary mt-8">
        Ver todas as comunidades
      </a>
    </main>
  )
}

/** Skeleton com a silhueta da home (sem layout shift no carregamento). */
function CommunityHomeSkeleton() {
  return (
    <main className="container-page py-12 md:py-16" aria-hidden="true">
      <div className="mx-auto max-w-3xl">
        <div className="bg-bg-subtle h-3 w-40 animate-pulse rounded" />
        <div className="bg-bg-subtle mt-4 h-12 w-3/4 animate-pulse rounded" />
        <div className="bg-bg-subtle mt-5 h-4 w-full animate-pulse rounded" />
        <div className="bg-bg-subtle mt-2 h-4 w-5/6 animate-pulse rounded" />
        <div className="bg-bg-subtle mt-8 aspect-[16/9] w-full animate-pulse rounded-2xl" />
      </div>
    </main>
  )
}

function PinIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      aria-hidden="true"
    >
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  )
}
