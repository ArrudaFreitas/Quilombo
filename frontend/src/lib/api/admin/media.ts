import { z } from 'zod'
import { clientFetch } from '../client'

/**
 * Acervo de imagens da comunidade no painel ({@code /api/v1/admin}, Bearer do
 * tenant): listar, enviar (multipart, com processamento e quota no backend) e
 * consultar a quota. As URLs são absolutas (MinIO/S3). camelCase + zod.
 */

const imageSchema = z.object({
  filename: z.string(),
  url: z.string(),
  sizeKb: z.number().default(0),
  altText: z.string().nullable().default(null),
  inUse: z.boolean(),
})

export type AdminImage = z.infer<typeof imageSchema>

const storageSchema = z.object({
  usedBytes: z.number(),
  limitBytes: z.number(),
  usedMb: z.number(),
  limitMb: z.number(),
  percent: z.number(),
})

export type StorageUsage = z.infer<typeof storageSchema>

/** Upload pode demorar (processamento → WebP no backend); timeout mais folgado. */
const UPLOAD_TIMEOUT_MS = 30_000

/** Imagens do acervo do tenant (mais recentes primeiro, ordenado no backend). */
export async function listImages(token: string): Promise<AdminImage[]> {
  const res = await clientFetch<unknown>('/admin/images', { token })
  return z.array(imageSchema).parse(res.data)
}

/** Envia uma imagem (com texto alternativo) e devolve o objeto criado. */
export async function uploadImage(
  token: string,
  file: File,
  altText: string,
): Promise<AdminImage> {
  const form = new FormData()
  form.append('file', file)
  form.append('altText', altText)
  const res = await clientFetch<unknown>('/admin/upload', {
    method: 'POST',
    token,
    body: form,
    signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
  })
  return imageSchema.parse(res.data)
}

/** Uso de quota do tenant — alimenta a barra de armazenamento. */
export async function getStorage(token: string): Promise<StorageUsage> {
  const res = await clientFetch<unknown>('/admin/storage', { token })
  return storageSchema.parse(res.data)
}

/** Atualiza o texto alternativo de uma imagem e devolve o objeto atualizado. */
export async function updateAltText(
  token: string,
  filename: string,
  altText: string,
): Promise<AdminImage> {
  const res = await clientFetch<unknown>(
    `/admin/images/${encodeURIComponent(filename)}/alt`,
    {
      method: 'PUT',
      token,
      body: JSON.stringify({ altText }),
    },
  )
  return imageSchema.parse(res.data)
}

/** Remove uma imagem do acervo. O backend recusa (em uso) com `ApiError`. */
export async function deleteImage(token: string, filename: string): Promise<void> {
  await clientFetch<unknown>(`/admin/images/${encodeURIComponent(filename)}`, {
    method: 'DELETE',
    token,
  })
}
