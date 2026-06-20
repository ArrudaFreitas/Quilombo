import { beforeEach, describe, expect, it, vi } from 'vitest'

const clientFetch = vi.fn()
vi.mock('@/lib/api/client', () => ({
  clientFetch: (...args: unknown[]) => clientFetch(...args),
}))

const { listImages, uploadImage, getStorage, updateAltText, deleteImage } =
  await import('@/lib/api/admin/media')

const envelope = (data: unknown) => ({
  data,
  meta: { timestamp: '2026-01-01T00:00:00Z', page: null },
})

const image = {
  filename: 'kalunga_abc.webp',
  url: '/quilombo-uploads/kalunga_abc.webp',
  sizeKb: 42.5,
  altText: 'Vista do território',
  inUse: false,
}

beforeEach(() => clientFetch.mockReset())

describe('admin media api', () => {
  it('lista as imagens do acervo em /admin/images', async () => {
    clientFetch.mockResolvedValue(envelope([image]))

    const result = await listImages('jwt')

    expect(clientFetch).toHaveBeenCalledWith('/admin/images', { token: 'jwt' })
    expect(result[0].filename).toBe('kalunga_abc.webp')
    expect(result[0].inUse).toBe(false)
  })

  it('faz upload multipart em /admin/upload com file + altText', async () => {
    clientFetch.mockResolvedValue(envelope(image))
    const file = new File(['x'], 'foto.png', { type: 'image/png' })

    const result = await uploadImage('jwt', file, 'Vista do território')

    const [path, options] = clientFetch.mock.calls[0]
    expect(path).toBe('/admin/upload')
    expect(options.method).toBe('POST')
    expect(options.token).toBe('jwt')
    expect(options.body).toBeInstanceOf(FormData)
    expect((options.body as FormData).get('altText')).toBe('Vista do território')
    expect((options.body as FormData).get('file')).toBeInstanceOf(File)
    expect(result.url).toContain('kalunga_abc.webp')
  })

  it('atualiza o alt em PUT /admin/images/{filename}/alt', async () => {
    clientFetch.mockResolvedValue(envelope({ ...image, altText: 'Novo alt' }))

    const result = await updateAltText('jwt', 'kalunga_abc.webp', 'Novo alt')

    expect(clientFetch).toHaveBeenCalledWith(
      '/admin/images/kalunga_abc.webp/alt',
      expect.objectContaining({
        method: 'PUT',
        token: 'jwt',
        body: JSON.stringify({ altText: 'Novo alt' }),
      }),
    )
    expect(result.altText).toBe('Novo alt')
  })

  it('remove a imagem em DELETE /admin/images/{filename}', async () => {
    clientFetch.mockResolvedValue(envelope(null))

    await deleteImage('jwt', 'kalunga_abc.webp')

    expect(clientFetch).toHaveBeenCalledWith(
      '/admin/images/kalunga_abc.webp',
      expect.objectContaining({ method: 'DELETE', token: 'jwt' }),
    )
  })

  it('busca a quota em /admin/storage', async () => {
    clientFetch.mockResolvedValue(
      envelope({
        usedBytes: 1048576,
        limitBytes: 52428800,
        usedMb: 1,
        limitMb: 50,
        percent: 2,
      }),
    )

    const result = await getStorage('jwt')

    expect(clientFetch).toHaveBeenCalledWith('/admin/storage', { token: 'jwt' })
    expect(result.percent).toBe(2)
    expect(result.limitMb).toBe(50)
  })
})
