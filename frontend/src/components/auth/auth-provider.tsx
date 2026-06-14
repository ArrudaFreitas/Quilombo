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
  loginWithGoogle as apiLoginWithGoogle,
  logout as apiLogout,
  refreshSession,
  type AuthUser,
} from '@/lib/api/auth'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

type AuthContextValue = {
  status: AuthStatus
  user: AuthUser | null
  /** Access token corrente (em memória) — para chamadas autenticadas futuras. */
  getAccessToken: () => string | null
  /** Conclui o login trocando o idToken do Google (GIS) por uma sessão. */
  loginWithGoogle: (idToken: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * Fonte de verdade da sessão no cliente. O access token (JWT curto) vive só em
 * memória (`useRef`); a sessão durável é o refresh httpOnly do backend, do qual
 * recuperamos a sessão no load (silent refresh). Não há nenhum caminho de bypass.
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

  // Silent refresh único no mount: se houver refresh válido, recupera a sessão.
  // Já-logado que cai no /login é reconhecido aqui e redirecionado pelo LoginForm.
  useEffect(() => {
    if (bootstrapped.current) return
    bootstrapped.current = true

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
  }, [establish])

  // O botão GIS roda no subdomínio do tenant; o idToken é trocado por uma sessão
  // em POST /auth/google (same-origin), que o nginx roteia preservando o Host.
  const loginWithGoogle = useCallback(
    async (idToken: string) => {
      await establish(await apiLoginWithGoogle(idToken))
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
      logout,
    }),
    [status, user, loginWithGoogle, logout],
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
