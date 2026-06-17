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
import { useRouter } from 'next/navigation'
import {
  getMe,
  logout as apiLogout,
  refreshSession,
  type AuthUser,
} from '@/lib/api/auth'
import { ApiError } from '@/lib/api/client'

export type AuthStatus =
  | 'loading'
  | 'authenticated'
  | 'unauthenticated'
  /** Identidade válida, mas o e-mail não é admin DESTA comunidade (403 no refresh). */
  | 'forbidden'

type AuthContextValue = {
  status: AuthStatus
  user: AuthUser | null
  /** Access token corrente (em memória) — para chamadas autenticadas futuras. */
  getAccessToken: () => string | null
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * Fonte de verdade da sessão no cliente, montada por tenant (subdomínio). O access
 * token (JWT curto) vive só em memória (`useRef`); a sessão durável são os cookies
 * httpOnly do backend (refresh por-tenant + identidade no domínio-pai). No load, o
 * silent refresh troca a identidade pela sessão desta comunidade — ou sinaliza
 * `forbidden` (403) se o e-mail não for admin aqui. O login em si é centralizado no
 * ápice (`/login`), fora deste provider. Não há nenhum caminho de bypass.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
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

  // Silent refresh único no mount: bootstrapa a sessão desta comunidade a partir dos
  // cookies. 403 = logado, mas não-admin daqui (não adianta mandar relogar).
  useEffect(() => {
    if (bootstrapped.current) return
    bootstrapped.current = true

    let active = true
    void (async () => {
      try {
        const token = await refreshSession()
        if (active) await establish(token)
      } catch (err) {
        if (!active) return
        accessToken.current = null
        setUser(null)
        setStatus(
          err instanceof ApiError && err.status === 403
            ? 'forbidden'
            : 'unauthenticated',
        )
      }
    })()
    return () => {
      active = false
    }
  }, [establish])

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
      logout,
    }),
    [status, user, logout],
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
