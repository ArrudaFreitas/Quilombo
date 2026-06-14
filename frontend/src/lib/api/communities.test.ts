import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiFetch = vi.fn()
vi.mock('@/lib/api/server', () => ({
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}))

const { getCommunities } = await import('@/lib/api/communities')

const card = {
  slug: 'kalunga',
  name: 'Kalunga',
  location: 'Chapada dos Veadeiros, GO',
  imageUrl: null,
  shortDescription: null,
}
const pageInfo = { size: 12, number: 0, totalElements: 1, totalPages: 1 }
const envelope = (data: unknown, page: unknown) => ({
  data,
  meta: { timestamp: '2026-01-01T00:00:00Z', page },
})

function queryOf(call: number) {
  const path = apiFetch.mock.calls[call][0] as string
  return new URLSearchParams(path.split('?')[1])
}

beforeEach(() => apiFetch.mockReset())

describe('getCommunities', () => {
  it('converte página 1-based em 0-based e repassa size, ignorando nome em branco', async () => {
    apiFetch.mockResolvedValue(envelope([card], pageInfo))

    await getCommunities({ page: 2, size: 12, query: '   ' })

    const qs = queryOf(0)
    expect(qs.get('page')).toBe('1')
    expect(qs.get('size')).toBe('12')
    expect(qs.has('name')).toBe(false)
  })

  it('envia name (trim) quando há busca', async () => {
    apiFetch.mockResolvedValue(envelope([], { ...pageInfo, totalElements: 0 }))

    await getCommunities({ query: '  palma ' })

    expect(queryOf(0).get('name')).toBe('palma')
  })

  it('valida e retorna itens + paginação', async () => {
    apiFetch.mockResolvedValue(envelope([card], pageInfo))

    const result = await getCommunities()

    expect(result.items).toHaveLength(1)
    expect(result.items[0].slug).toBe('kalunga')
    expect(result.page.totalElements).toBe(1)
  })

  it('lança quando o payload da API é malformado', async () => {
    apiFetch.mockResolvedValue(envelope([{ slug: 'x' }], pageInfo))

    await expect(getCommunities()).rejects.toThrow()
  })
})
