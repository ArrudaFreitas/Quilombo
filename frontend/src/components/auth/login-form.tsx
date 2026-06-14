'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { safeReturnTo } from '@/lib/auth/tenant'
import { useAuth } from './auth-provider'

/**
 * CTA de login. O único caminho de autenticação é o Google real (OAuth do
 * backend) — sem login alternativo/bypass. Inicia uma navegação full-page para
 * o handshake; o botão entra em estado de "redirecionando" para feedback.
 * Usuário já autenticado é mandado direto para a área protegida.
 */
export function LoginForm({ returnTo }: { returnTo?: string }) {
  const { status, loginWithGoogle } = useAuth()
  const router = useRouter()
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    if (status === 'authenticated') router.replace(safeReturnTo(returnTo))
  }, [status, returnTo, router])

  function handleGoogle() {
    setRedirecting(true)
    loginWithGoogle(returnTo)
  }

  const busy = redirecting || status === 'authenticated'

  return (
    <div>
      <button
        type="button"
        onClick={handleGoogle}
        disabled={busy}
        aria-busy={busy}
        className="btn btn-primary btn-lg w-full"
      >
        {busy ? (
          <>
            <span className="btn-spinner" aria-hidden="true" />
            Redirecionando…
          </>
        ) : (
          <>
            <GoogleIcon />
            Entrar com Google
          </>
        )}
      </button>

      <p className="text-fg-subtle mt-5 text-center text-sm text-balance">
        Apenas administradores previamente autorizados têm acesso.
      </p>
    </div>
  )
}

/** Logotipo "G" do Google (decorativo — o rótulo acessível vem do texto do botão). */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  )
}
