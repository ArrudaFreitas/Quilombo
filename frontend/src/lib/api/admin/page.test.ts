import { beforeEach, describe, expect, it, vi } from 'vitest'

const clientFetch = vi.fn()
vi.mock('@/lib/api/client', () => ({
  clientFetch: (...args: unknown[]) => clientFetch(...args),
}))

const {
  getPage,
  updateStyle,
  createSection,
  updateSectionContent,
  toggleSection,
  reorderSections,
  deleteSection,
} = await import('@/lib/api/admin/page')

const envelope = (data: unknown) => ({
  data,
  meta: { timestamp: '2026-01-01T00:00:00Z', page: null },
})

const page = {
  style: 'uniao',
  palette: 'verde',
  sections: [
    {
      id: 1,
      sectionType: 'hero',
      orderIndex: 0,
      active: true,
      content: { title: 'Oi' },
    },
  ],
}

beforeEach(() => clientFetch.mockReset())

describe('admin page api', () => {
  it('busca a página em /admin/page', async () => {
    clientFetch.mockResolvedValue(envelope(page))

    const result = await getPage('jwt')

    expect(clientFetch).toHaveBeenCalledWith('/admin/page', { token: 'jwt' })
    expect(result.style).toBe('uniao')
    expect(result.sections[0].sectionType).toBe('hero')
  })

  it('troca estilo/paleta em PUT /admin/page/style', async () => {
    clientFetch.mockResolvedValue(
      envelope({ ...page, style: 'raizes', palette: 'ocre' }),
    )

    const result = await updateStyle('jwt', 'raizes', 'ocre')

    expect(clientFetch).toHaveBeenCalledWith(
      '/admin/page/style',
      expect.objectContaining({
        method: 'PUT',
        token: 'jwt',
        body: JSON.stringify({ style: 'raizes', palette: 'ocre' }),
      }),
    )
    expect(result.palette).toBe('ocre')
  })

  it('cria seção em POST /admin/sections com tipo + conteúdo', async () => {
    clientFetch.mockResolvedValue(envelope(page))

    await createSection('jwt', 'events', { title: 'X' })

    expect(clientFetch).toHaveBeenCalledWith(
      '/admin/sections',
      expect.objectContaining({
        method: 'POST',
        token: 'jwt',
        body: JSON.stringify({
          sectionType: 'events',
          content: { title: 'X' },
        }),
      }),
    )
  })

  it('atualiza conteúdo em PUT /admin/sections/{id}', async () => {
    clientFetch.mockResolvedValue(envelope(page))

    await updateSectionContent('jwt', 7, { title: 'Y' })

    expect(clientFetch).toHaveBeenCalledWith(
      '/admin/sections/7',
      expect.objectContaining({
        method: 'PUT',
        token: 'jwt',
        body: JSON.stringify({ content: { title: 'Y' } }),
      }),
    )
  })

  it('alterna visibilidade em PATCH /admin/sections/{id}/toggle', async () => {
    clientFetch.mockResolvedValue(envelope(page))

    await toggleSection('jwt', 7)

    expect(clientFetch).toHaveBeenCalledWith(
      '/admin/sections/7/toggle',
      expect.objectContaining({ method: 'PATCH', token: 'jwt' }),
    )
  })

  it('reordena em PUT /admin/sections/reorder', async () => {
    clientFetch.mockResolvedValue(envelope(page))

    await reorderSections('jwt', [3, 1, 2])

    expect(clientFetch).toHaveBeenCalledWith(
      '/admin/sections/reorder',
      expect.objectContaining({
        method: 'PUT',
        token: 'jwt',
        body: JSON.stringify({ ids: [3, 1, 2] }),
      }),
    )
  })

  it('remove seção em DELETE /admin/sections/{id}', async () => {
    clientFetch.mockResolvedValue(envelope(page))

    await deleteSection('jwt', 7)

    expect(clientFetch).toHaveBeenCalledWith(
      '/admin/sections/7',
      expect.objectContaining({ method: 'DELETE', token: 'jwt' }),
    )
  })
})
