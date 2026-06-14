'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { AuthPending } from './auth-pending'
import { useAuth } from './auth-provider'

/**
 * Gate de rota client-side: só renderiza os filhos quando autenticado. Enquanto
 * a sessão é resolvida mostra um estado de espera acessível; se não autenticado,
 * redireciona para o login preservando o destino (`returnTo`).
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { status } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (status !== 'unauthenticated') return
    const returnTo =
      pathname && pathname !== '/login'
        ? `?returnTo=${encodeURIComponent(pathname)}`
        : ''
    router.replace(`/login${returnTo}`)
  }, [status, pathname, router])

  if (status === 'authenticated') return <>{children}</>

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
