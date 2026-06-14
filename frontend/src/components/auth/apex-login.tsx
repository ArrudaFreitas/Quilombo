'use client'

import { useState } from 'react'
import { establishIdentity } from '@/lib/api/auth'
import { ApiError } from '@/lib/api/client'
import { safeReturnUrl } from '@/lib/auth/tenant'
import { GoogleSignInButton } from './google-sign-in-button'

/**
 * Login centralizado no ápice. O botão oficial do Google (GIS) devolve o idToken,
 * que estabelece a **identidade** no backend (cookie do domínio-pai). Em seguida volta
 * para o subdomínio de origem (`returnTo`), onde a sessão da comunidade é cunhada pela
 * allowlist. Por rodar só no ápice, o Google precisa de **uma única origem** registrada.
 * Standalone (sem `AuthProvider`): a sessão vive nos subdomínios, não aqui.
 */
export function ApexLogin({ returnTo }: { returnTo?: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCredential(idToken: string) {
    setLoading(true)
    setError(null)
    try {
      await establishIdentity(idToken)
      const baseDomain =
        process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'quilombo.localhost'
      // full-page para o subdomínio: lá o silent-refresh troca a identidade pela sessão
      window.location.assign(safeReturnUrl(returnTo, baseDomain))
    } catch (err) {
      setError(messageFor(err))
      setLoading(false)
    }
  }

  return (
    <div>
      <div aria-busy={loading}>
        {loading ? (
          <p
            role="status"
            className="text-fg-muted flex items-center justify-center gap-2 py-2 text-sm"
          >
            <span className="btn-spinner" aria-hidden="true" />
            Entrando…
          </p>
        ) : (
          <GoogleSignInButton onCredential={handleCredential} />
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="text-danger mt-5 text-center text-sm text-balance"
        >
          {error}
        </p>
      )}

      <p className="text-fg-subtle mt-5 text-center text-sm text-balance">
        Apenas administradores previamente autorizados têm acesso.
      </p>
    </div>
  )
}

/** Mapeia o erro da API para uma mensagem ao usuário (ProblemDetail → status). */
function messageFor(error: unknown): string {
  if (error instanceof ApiError && error.status === 401) {
    return 'Não foi possível validar sua conta do Google.'
  }
  return 'Não foi possível entrar. Tente novamente.'
}
