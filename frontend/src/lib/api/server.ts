import 'server-only'
import type { ApiResponse } from './types'

const API_URL = process.env.API_URL

/** Tempo máximo de espera por resposta do backend (ms). */
const DEFAULT_TIMEOUT_MS = 10_000

class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  if (!API_URL) throw new Error('API_URL não configurada')

  const url = `${API_URL}/api/v1${path}`

  let response: Response
  try {
    response = await fetch(url, {
      ...options,
      signal: options?.signal ?? AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
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
    // Erros seguem RFC 7807 (ProblemDetail) — o campo `detail` traz a mensagem.
    const body = await response
      .json()
      .catch(() => ({ detail: response.statusText }))
    throw new ApiError(
      response.status,
      (body as { detail?: string }).detail ?? 'Erro desconhecido'
    )
  }

  return response.json() as Promise<ApiResponse<T>>
}

export { apiFetch, ApiError }
