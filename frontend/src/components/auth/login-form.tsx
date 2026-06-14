'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ApiError } from '@/lib/api/client'
import { safeReturnTo } from '@/lib/auth/tenant'
import { useAuth } from './auth-provider'
import { GoogleSignInButton } from './google-sign-in-button'

/**
 * CTA de login. O único caminho de autenticação é o Google real — o botão oficial
 * do Google Identity Services devolve o idToken, trocado por uma sessão no backend
 * (`POST /auth/google`). Sem login alternativo/bypass. Usuário já autenticado é
 * mandado direto para a área protegida.
 */
export function LoginForm({ returnTo }: { returnTo?: string }) {
  const { status, loginWithGoogle } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'authenticated') router.replace(safeReturnTo(returnTo))
  }, [status, returnTo, router])

  async function handleCredential(idToken: string) {
    setLoading(true)
    setError(null)
    try {
      // sucesso muda o status para 'authenticated' → o efeito acima redireciona
      await loginWithGoogle(idToken)
    } catch (err) {
      setError(messageFor(err))
      setLoading(false)
    }
  }

  const busy = loading || status === 'authenticated'

  return (
    <div>
      <div aria-busy={busy}>
        {busy ? (
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
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Não foi possível validar sua conta do Google.'
    if (error.status === 403) return 'Este e-mail não está autorizado nesta comunidade.'
  }
  return 'Não foi possível entrar. Tente novamente.'
}
