import { z } from 'zod'
import { clientFetch } from './client'

/**
 * Camada de API de autenticação (cliente, same-origin). Valida em runtime tudo
 * que vem do backend (zod). Contrato real (prefixo `/api/v1`):
 *   POST /auth/google  { idToken } → estabelece a identidade (cookie do domínio-pai)
 *   POST /auth/refresh (cookies)   → { data: { token } }  (bootstrap/rotação por tenant)
 *   GET  /auth/me      (Bearer)    → { data: { id, name, communitySlug } }
 *   POST /auth/logout  (cookies)   → expira os cookies (idempotente)
 *
 * O login acontece no ápice (uma única origem no Google): /auth/google verifica o
 * idToken e seta o cookie de identidade. Já no subdomínio, /auth/refresh troca a
 * identidade pela sessão daquela comunidade. O access token (JWT curto) vive só em
 * memória; refresh e identidade são httpOnly, invisíveis ao JavaScript.
 */

const tokenSchema = z.object({ token: z.string() })

const meSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  communitySlug: z.string(),
})

export type AuthUser = z.infer<typeof meSchema>

/** Verifica o idToken (GIS) e estabelece a identidade no cookie do domínio-pai. */
export async function establishIdentity(idToken: string): Promise<void> {
  await clientFetch<unknown>('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
  })
}

/** Renova o access token a partir do cookie httpOnly de refresh. */
export async function refreshSession(): Promise<string> {
  const res = await clientFetch<unknown>('/auth/refresh', { method: 'POST' })
  return tokenSchema.parse(res.data).token
}

/** Sessão atual (assinatura/expiração no filtro, allowlist no banco). Requer Bearer. */
export async function getMe(token: string): Promise<AuthUser> {
  const res = await clientFetch<unknown>('/auth/me', { token })
  return meSchema.parse(res.data)
}

/** Revoga a sessão longa e expira o cookie. Idempotente. */
export async function logout(): Promise<void> {
  await clientFetch<unknown>('/auth/logout', { method: 'POST' })
}
