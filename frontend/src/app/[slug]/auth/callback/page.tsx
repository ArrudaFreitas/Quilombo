'use client'

import Link from 'next/link'
import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuthPending } from '@/components/auth/auth-pending'
import { useAuth } from '@/components/auth/auth-provider'
import { ApiError } from '@/lib/api/client'
import { safeReturnTo } from '@/lib/auth/tenant'

/**
 * Conclui o login no subdomínio do tenant: troca o `code` do callback OAuth por
 * um access token (`POST /auth/token`, same-origin) e redireciona para o destino.
 * `useSearchParams` exige uma fronteira de Suspense.
 */
export default function CallbackPage() {
  return (
    <Suspense fallback={<AuthPending label="Concluindo o login…" />}>
      <CallbackInner />
    </Suspense>
  )
}

function CallbackInner() {
  const params = useSearchParams()
  const code = params.get('code')
  const returnTo = params.get('returnTo')
  const { completeOAuth } = useAuth()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)

  useEffect(() => {
    // Sem código não há o que trocar (tratado no render); evita setState síncrono
    // dentro do efeito. A troca só dispara uma vez.
    if (!code || started.current) return
    started.current = true

    completeOAuth(code)
      .then(() => router.replace(safeReturnTo(returnTo)))
      .catch((err) =>
        setError(
          err instanceof ApiError
            ? err.message
            : 'Não foi possível concluir o login. Tente novamente.',
        ),
      )
  }, [code, returnTo, completeOAuth, router])

  const message = !code ? 'Código de autenticação ausente ou inválido.' : error
  if (message) return <CallbackError message={message} />

  return <AuthPending label="Concluindo o login…" />
}

function CallbackError({ message }: { message: string }) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="container-page flex min-h-dvh flex-col items-center justify-center py-12 text-center"
    >
      <div className="text-danger mb-5 text-6xl leading-none" aria-hidden="true">
        ⚠
      </div>
      <h1 className="font-display text-fg text-2xl">Não foi possível entrar</h1>
      <p role="alert" className="text-fg-muted mt-3 max-w-md text-balance">
        {message}
      </p>
      <Link href="/login" className="btn btn-primary mt-8">
        Voltar ao login
      </Link>
    </main>
  )
}
