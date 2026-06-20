import { beforeEach, describe, expect, it, vi } from 'vitest'

const clientFetch = vi.fn()
vi.mock('@/lib/api/client', () => ({
  clientFetch: (...args: unknown[]) => clientFetch(...args),
}))

const { getCard, updateCard } = await import('@/lib/api/admin/card')

const envelope = (data: unknown) => ({
  data,
  meta: { timestamp: '2026-01-01T00:00:00Z', page: null },
})

const card = {
  name: 'Kalunga',
  location: 'Chapada dos Veadeiros, GO',
  imageUrl: null,
  shortDescription: 'Maior comunidade quilombola do país.',
}

beforeEach(() => clientFetch.mockReset())

describe('admin card api', () => {
  it('busca o card em /admin/card com o token', async () => {
    clientFetch.mockResolvedValue(envelope(card))

    const result = await getCard('jwt')

    expect(clientFetch).toHaveBeenCalledWith('/admin/card', { token: 'jwt' })
    expect(result.name).toBe('Kalunga')
    expect(result.shortDescription).toContain('quilombola')
  })

  it('envia PUT /admin/card com o corpo serializado e devolve o card atualizado', async () => {
    clientFetch.mockResolvedValue(
      envelope({ ...card, shortDescription: 'Nova descrição.' }),
    )

    const result = await updateCard('jwt', {
      imageUrl: null,
      imageAltText: null,
      shortDescription: 'Nova descrição.',
    })

    expect(clientFetch).toHaveBeenCalledWith(
      '/admin/card',
      expect.objectContaining({
        method: 'PUT',
        token: 'jwt',
        body: JSON.stringify({
          imageUrl: null,
          imageAltText: null,
          shortDescription: 'Nova descrição.',
        }),
      }),
    )
    expect(result.shortDescription).toBe('Nova descrição.')
  })

  it('lança quando o payload da API é malformado', async () => {
    clientFetch.mockResolvedValue(envelope({ name: 'x' }))

    await expect(getCard('jwt')).rejects.toThrow()
  })
})
