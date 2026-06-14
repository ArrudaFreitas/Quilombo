'use client'

import { useEffect } from 'react'
import { AuthPending } from './auth-pending'
import { useAuth } from './auth-provider'

/**
 * Gate de rota client-side (subdomínio do tenant). Autenticado → renderiza os filhos.
 * Não autenticado → manda para o login **centralizado no ápice** (full-page, cross-subdomínio),
 * preservando o destino (`returnTo`). `forbidden` → identidade válida mas não-admin desta
 * comunidade: mostra um aviso (não adianta relogar) com a opção de trocar de conta.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { status, logout } = useAuth()

  useEffect(() => {
    if (status !== 'unauthenticated') return
    const baseDomain =
      process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'quilombo.localhost'
    const { protocol, port, href } = window.location
    const portPart = port ? `:${port}` : ''
    // login no ápice: uma única origem registrada no Google atende todos os subdomínios
    window.location.assign(
      `${protocol}//${baseDomain}${portPart}/login?returnTo=${encodeURIComponent(href)}`,
    )
  }, [status])

  if (status === 'authenticated') return <>{children}</>

  if (status === 'forbidden') {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="container-page flex min-h-dvh flex-col items-center justify-center py-12 text-center"
      >
        <div className="text-fg-muted mb-5 text-6xl leading-none" aria-hidden="true">
          ⛔
        </div>
        <h1 className="font-display text-fg text-2xl">Sem acesso a esta comunidade</h1>
        <p role="alert" className="text-fg-muted mt-3 max-w-md text-balance">
          Sua conta do Google não é administradora desta comunidade.
        </p>
        <button
          type="button"
          onClick={() => void logout()}
          className="btn btn-primary mt-8"
        >
          Entrar com outra conta
        </button>
      </main>
    )
  }

  return (
    <AuthPending
      label={
        status === 'unauthenticated'
          ? 'Redirecionando para o login…'
          : 'Verificando sua sessão…'
      }
    />
  )
}
