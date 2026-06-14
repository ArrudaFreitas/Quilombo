'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  exchangeCode,
  getMe,
  logout as apiLogout,
  refreshSession,
  type AuthUser,
} from '@/lib/api/auth'
import { safeReturnTo } from '@/lib/auth/tenant'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

type AuthContextValue = {
  status: AuthStatus
  user: AuthUser | null
  /** Access token corrente (em memória) — para chamadas autenticadas futuras. */
  getAccessToken: () => string | null
  /** Inicia o OAuth do Google (navegação full-page). `returnTo` é preservado no callback. */
  loginWithGoogle: (returnTo?: string) => void
  /** Conclui o login trocando o código do callback por um access token. */
  completeOAuth: (code: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

/** Cookies efêmeros (domínio pai) que sobrevivem ao round-trip do OAuth até a raiz. */
const TENANT_COOKIE = 'quilombo_login_tenant'
const RETURN_COOKIE = 'quilombo_login_return'
/** Início do handshake OAuth — same-origin, roteado ao backend pelo nginx. */
const GOOGLE_AUTH_PATH = '/oauth2/authorization/google'

/**
 * Fonte de verdade da sessão no cliente. O access token (JWT curto) vive só em
 * memória (`useRef`); a sessão durável é o refresh httpOnly do backend, do qual
 * recuperamos a sessão no load (silent refresh). Não há nenhum caminho de bypass.
 */
export function AuthProvider({
  slug,
  children,
}: {
  slug: string
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<AuthUser | null>(null)
  const accessToken = useRef<string | null>(null)
  const bootstrapped = useRef(false)

  const establish = useCallback(async (token: string) => {
    accessToken.current = token
    const me = await getMe(token)
    setUser(me)
    setStatus('authenticated')
  }, [])

  // Silent refresh único no mount: se houver refresh válido, recupera a sessão.
  // Na própria rota de callback é o fluxo OAuth que estabelece a sessão — não
  // disparamos refresh aqui para evitar corrida com a troca do código.
  useEffect(() => {
    if (bootstrapped.current) return
    bootstrapped.current = true
    if (pathname?.endsWith('/auth/callback')) return

    let active = true
    void (async () => {
      try {
        const token = await refreshSession()
        if (active) await establish(token)
      } catch {
        if (!active) return
        accessToken.current = null
        setUser(null)
        setStatus('unauthenticated')
      }
    })()
    return () => {
      active = false
    }
  }, [pathname, establish])

  const loginWithGoogle = useCallback(
    (returnTo?: string) => {
      const baseDomain =
        process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'quilombo.localhost'
      // O callback do backend volta no domínio raiz; estes cookies levam o tenant
      // e o destino através do round-trip (curtos, sem segredo).
      const attrs = `domain=.${baseDomain}; path=/; max-age=600; samesite=lax; secure`
      document.cookie = `${TENANT_COOKIE}=${encodeURIComponent(slug)}; ${attrs}`
      document.cookie = `${RETURN_COOKIE}=${encodeURIComponent(
        safeReturnTo(returnTo),
      )}; ${attrs}`
      window.location.assign(GOOGLE_AUTH_PATH)
    },
    [slug],
  )

  const completeOAuth = useCallback(
    async (code: string) => {
      await establish(await exchangeCode(code))
    },
    [establish],
  )

  const logout = useCallback(async () => {
    try {
      await apiLogout()
    } catch {
      /* idempotente: mesmo se falhar, derrubamos a sessão local */
    }
    accessToken.current = null
    setUser(null)
    setStatus('unauthenticated')
    router.replace('/login')
  }, [router])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      getAccessToken: () => accessToken.current,
      loginWithGoogle,
      completeOAuth,
      logout,
    }),
    [status, user, loginWithGoogle, completeOAuth, logout],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  }
  return context
}
