import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, clientFetch } from './client'

function jsonResponse(
  body: unknown,
  init?: { status?: number; ok?: boolean },
): Response {
  return {
    ok: init?.ok ?? true,
    status: init?.status ?? 200,
    statusText: 'OK',
    json: () => Promise.resolve(body),
  } as unknown as Response
}

afterEach(() => vi.restoreAllMocks())

describe('clientFetch', () => {
  it('chama /api/v1 + path e parseia o envelope { data, meta }', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        data: { token: 'abc' },
        meta: { timestamp: 't', page: null },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const res = await clientFetch<{ token: string }>('/auth/refresh', {
      method: 'POST',
    })

    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/auth/refresh')
    expect(res.data.token).toBe('abc')
  })

  it('anexa Authorization: Bearer quando há token', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ data: {}, meta: {} }))
    vi.stubGlobal('fetch', fetchMock)

    await clientFetch('/auth/me', { token: 'jwt-123' })

    const headers = (fetchMock.mock.calls[0][1] as RequestInit)
      .headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer jwt-123')
  })

  it('não anexa Authorization quando não há token', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ data: {}, meta: {} }))
    vi.stubGlobal('fetch', fetchMock)

    await clientFetch('/auth/refresh', { method: 'POST' })

    const headers = (fetchMock.mock.calls[0][1] as RequestInit)
      .headers as Record<string, string>
    expect('Authorization' in headers).toBe(false)
  })

  it('mapeia ProblemDetail (não-ok) para ApiError com a mensagem `detail`', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse(
            { detail: 'Sessão inválida' },
            { ok: false, status: 401 },
          ),
        ),
    )

    const error = await clientFetch('/auth/me', { token: 'x' }).catch((e) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 401, message: 'Sessão inválida' })
  })

  it('falha de rede vira ApiError 503', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network')))
    await expect(
      clientFetch('/auth/refresh', { method: 'POST' }),
    ).rejects.toMatchObject({ status: 503 })
  })

  it('timeout vira ApiError 504', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new DOMException('timeout', 'TimeoutError')),
    )
    await expect(
      clientFetch('/auth/refresh', { method: 'POST' }),
    ).rejects.toMatchObject({ status: 504 })
  })

  it('omite Content-Type JSON quando o corpo é FormData (boundary do browser)', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ data: {}, meta: {} }))
    vi.stubGlobal('fetch', fetchMock)

    const form = new FormData()
    form.append('file', 'x')
    await clientFetch('/admin/upload', { method: 'POST', body: form })

    const headers = (fetchMock.mock.calls[0][1] as RequestInit)
      .headers as Record<string, string>
    expect('Content-Type' in headers).toBe(false)
  })
})
