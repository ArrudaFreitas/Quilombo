import type { ApiResponse } from './types'

/** Tempo máximo de espera por resposta do backend (ms). */
const DEFAULT_TIMEOUT_MS = 10_000

/**
 * Erro de API no cliente — espelha `ApiError` de `server.ts` (mesma semântica de
 * status + mensagem extraída do ProblemDetail), mas para o ambiente do browser.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export interface ClientFetchOptions extends RequestInit {
  /** Access token (Bearer) a anexar quando a chamada for autenticada. */
  token?: string | null
}

/**
 * Wrapper de fetch do **browser** para a API (`/api/v1`, caminho relativo →
 * same-origin via nginx, que preserva o Host do subdomínio para o backend
 * resolver o tenant). Os cookies httpOnly (refresh) viajam sozinhos. Erros
 * seguem RFC 7807 (ProblemDetail): o campo `detail` vira a mensagem do `ApiError`.
 */
export async function clientFetch<T>(
  path: string,
  { token, headers, signal, ...options }: ClientFetchOptions = {},
): Promise<ApiResponse<T>> {
  // FormData carrega seu próprio Content-Type (com boundary) — não sobrepor com JSON.
  const isMultipart =
    typeof FormData !== 'undefined' && options.body instanceof FormData

  let response: Response
  try {
    response = await fetch(`/api/v1${path}`, {
      ...options,
      credentials: 'same-origin',
      signal: signal ?? AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
      headers: {
        ...(isMultipart ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    })
  } catch (error) {
    // Timeout (AbortSignal.timeout) vs. falha de conexão/DNS/rede.
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new ApiError(504, 'Tempo de resposta do servidor esgotado')
    }
    throw new ApiError(503, 'Não foi possível conectar ao servidor')
  }

  if (!response.ok) {
    const body = await response
      .json()
      .catch(() => ({ detail: response.statusText }))
    throw new ApiError(
      response.status,
      (body as { detail?: string }).detail ?? 'Erro desconhecido',
    )
  }

  // Respostas sem corpo (ex.: alguns 204) — devolve um envelope vazio tolerável.
  if (response.status === 204) {
    return { data: undefined as T, meta: { timestamp: '', page: null } }
  }
  return (await response.json()) as ApiResponse<T>
}
