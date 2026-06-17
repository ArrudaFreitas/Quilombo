import { beforeEach, describe, expect, it, vi } from 'vitest'

const clientFetch = vi.fn()
vi.mock('@/lib/api/client', () => ({
  clientFetch: (...args: unknown[]) => clientFetch(...args),
}))

const { getCommunityPage } = await import('@/lib/api/community-page')

const envelope = (data: unknown) => ({
  data,
  meta: { timestamp: '2026-01-01T00:00:00Z', page: null },
})

const fullPage = {
  community: {
    slug: 'kalunga',
    name: 'Kalunga',
    location: 'Chapada dos Veadeiros, GO',
  },
  card: { imageUrl: null, shortDescription: 'Maior comunidade quilombola do país.' },
  page: { style: 'uniao', palette: 'verde' },
  sections: [],
}

beforeEach(() => clientFetch.mockReset())

describe('getCommunityPage', () => {
  it('busca a página do tenant em /community (same-origin → Host do subdomínio)', async () => {
    clientFetch.mockResolvedValue(envelope(fullPage))

    await getCommunityPage()

    expect(clientFetch).toHaveBeenCalledWith('/community')
  })

  it('valida e devolve a identidade e o card da comunidade', async () => {
    clientFetch.mockResolvedValue(envelope(fullPage))

    const result = await getCommunityPage()

    expect(result.community.name).toBe('Kalunga')
    expect(result.card?.shortDescription).toContain('quilombola')
  })

  it('aceita card nulo (perfil ainda não preenchido pelo admin)', async () => {
    clientFetch.mockResolvedValue(envelope({ ...fullPage, card: null }))

    const result = await getCommunityPage()

    expect(result.card).toBeNull()
  })

  it('lança quando o payload da API é malformado', async () => {
    clientFetch.mockResolvedValue(envelope({ community: { slug: 'x' } }))

    await expect(getCommunityPage()).rejects.toThrow()
  })
})
