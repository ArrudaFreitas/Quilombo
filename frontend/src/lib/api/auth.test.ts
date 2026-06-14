import { beforeEach, describe, expect, it, vi } from 'vitest'

const clientFetch = vi.fn()
vi.mock('./client', () => ({
  clientFetch: (...args: unknown[]) => clientFetch(...args),
}))

const { loginWithGoogle, getMe, logout, refreshSession } = await import('./auth')

const envelope = (data: unknown) => ({
  data,
  meta: { timestamp: '2026-01-01T00:00:00Z', page: null },
})

function callArgs(index: number) {
  return clientFetch.mock.calls[index] as [string, Record<string, unknown>]
}

beforeEach(() => clientFetch.mockReset())

describe('auth API', () => {
  it('loginWithGoogle posta { idToken } em /auth/google e devolve o token', async () => {
    clientFetch.mockResolvedValue(envelope({ token: 'jwt' }))

    expect(await loginWithGoogle('id-token-abc')).toBe('jwt')

    const [path, opts] = callArgs(0)
    expect(path).toBe('/auth/google')
    expect(opts.method).toBe('POST')
    expect(JSON.parse(opts.body as string)).toEqual({ idToken: 'id-token-abc' })
  })

  it('refreshSession posta em /auth/refresh (cookie) e devolve o token', async () => {
    clientFetch.mockResolvedValue(envelope({ token: 'jwt2' }))

    expect(await refreshSession()).toBe('jwt2')

    const [path, opts] = callArgs(0)
    expect(path).toBe('/auth/refresh')
    expect(opts.method).toBe('POST')
  })

  it('getMe envia o Bearer e valida o usuário', async () => {
    clientFetch.mockResolvedValue(
      envelope({ id: 1, name: 'Maria', communitySlug: 'kalunga' }),
    )

    const me = await getMe('jwt')

    expect(me).toEqual({ id: 1, name: 'Maria', communitySlug: 'kalunga' })
    expect(callArgs(0)[1].token).toBe('jwt')
  })

  it('lança quando /auth/me devolve payload malformado', async () => {
    clientFetch.mockResolvedValue(envelope({ id: 'não-é-número' }))
    await expect(getMe('jwt')).rejects.toThrow()
  })

  it('logout posta em /auth/logout', async () => {
    clientFetch.mockResolvedValue(envelope(null))

    await logout()

    const [path, opts] = callArgs(0)
    expect(path).toBe('/auth/logout')
    expect(opts.method).toBe('POST')
  })
})
