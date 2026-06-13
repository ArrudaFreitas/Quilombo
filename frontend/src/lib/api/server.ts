import 'server-only'
import type { ApiResponse } from './types'

const API_URL = process.env.API_URL

class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<ApiResponse<T>> {
  if (!API_URL) throw new Error('API_URL não configurada')

  const url = `${API_URL}/api/v1${path}`
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const body = await response
      .json()
      .catch(() => ({ detail: response.statusText }))
    throw new ApiError(
      response.status,
      (body as { detail?: string }).detail ?? 'Erro desconhecido',
    )
  }

  return response.json() as Promise<ApiResponse<T>>
}

export { apiFetch, ApiError }
