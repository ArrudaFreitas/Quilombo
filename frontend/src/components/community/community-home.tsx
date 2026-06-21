'use client'

import { useEffect, useState } from 'react'
import { ApiError } from '@/lib/api/client'
import { getCommunityPage, type CommunityPage } from '@/lib/api/community-page'
import { InstitutionalPage } from './institutional-page'

type State =
  | { status: 'loading' }
  | { status: 'ready'; page: CommunityPage }
  | { status: 'not-found' }
  | { status: 'error' }

/**
 * Home pública de uma comunidade. Busca a página institucional no browser
 * (same-origin via nginx → o backend resolve o tenant pelo subdomínio) e, quando
 * pronta, renderiza a {@link InstitutionalPage} com o estilo/paleta/seções
 * configurados no painel. Slug inexistente (404) e demais erros têm estados
 * próprios (no chrome do produto, antes de conhecermos o tema da comunidade).
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

  return <InstitutionalPage page={state.page} />
}

/** Mensagem centralizada (404/erro), com retorno ao diretório no ápice. */
function Centered({ title, message }: { title: string; message: string }) {
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'quilombo.ianarruda.dev'
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

/** Skeleton neutro do produto (antes de conhecermos o tema da comunidade). */
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
