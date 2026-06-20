import { z } from 'zod'
import { clientFetch } from '../client'

/**
 * API do card da comunidade no painel ({@code /api/v1/admin/card}, Bearer do
 * tenant). Nome e localização são oficiais (somente leitura); o admin edita só
 * imagem e descrição curta. Contrato em camelCase, validado em runtime (zod).
 */

const cardSchema = z.object({
  name: z.string(),
  location: z.string(),
  imageUrl: z.string().nullable().default(null),
  imageAltText: z.string().nullable().default(null),
  shortDescription: z.string().nullable().default(null),
})

export type AdminCard = z.infer<typeof cardSchema>

export interface CardUpdate {
  imageUrl: string | null
  imageAltText: string | null
  shortDescription: string | null
}

/** Card atual do tenant. */
export async function getCard(token: string): Promise<AdminCard> {
  const res = await clientFetch<unknown>('/admin/card', { token })
  return cardSchema.parse(res.data)
}

/** Salva imagem + descrição e devolve o card atualizado. */
export async function updateCard(
  token: string,
  body: CardUpdate,
): Promise<AdminCard> {
  const res = await clientFetch<unknown>('/admin/card', {
    method: 'PUT',
    token,
    body: JSON.stringify(body),
  })
  return cardSchema.parse(res.data)
}
