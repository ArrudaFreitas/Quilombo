import 'server-only'
import { z } from 'zod'
import { apiFetch } from './server'

/**
 * Camada de API do diretório de comunidades — isolada da camada visual.
 * Valida em runtime tudo que vem do backend (zod): nada é consumido sem
 * verificação. Contrato real: GET /api/v1/communities?name=&page=&size=
 * → { data: CommunityCard[], meta: { page: {...} } }.
 */

const communitySchema = z.object({
  slug: z.string(),
  name: z.string(),
  location: z.string(),
  imageUrl: z.string().nullable().default(null),
  imageAltText: z.string().nullable().default(null),
  shortDescription: z.string().nullable().default(null),
})

const pageInfoSchema = z.object({
  size: z.number().int(),
  number: z.number().int(),
  totalElements: z.number().int(),
  totalPages: z.number().int(),
})

export type Community = z.infer<typeof communitySchema>
export type PageInfo = z.infer<typeof pageInfoSchema>

export interface CommunityListResult {
  items: Community[]
  page: PageInfo
}

export interface CommunityListParams {
  /** Busca parcial por nome (case-insensitive no backend). */
  query?: string
  /** Página baseada em 1 (a do usuário/URL); convertida para 0-based na API. */
  page?: number
  /** Itens por página. */
  size?: number
}

export const DEFAULT_PAGE_SIZE = 12

/**
 * Lista comunidades publicadas. Lança `ApiError` (HTTP) ou `ZodError`
 * (resposta inesperada) — ambos tratados pela error boundary da rota.
 */
export async function getCommunities({
  query,
  page = 1,
  size = DEFAULT_PAGE_SIZE,
}: CommunityListParams = {}): Promise<CommunityListResult> {
  const search = new URLSearchParams()
  const trimmed = query?.trim()
  if (trimmed) search.set('name', trimmed)
  search.set('page', String(Math.max(0, page - 1))) // UI 1-based → API 0-based
  search.set('size', String(size))

  const response = await apiFetch<unknown>(`/communities?${search.toString()}`)

  return {
    items: z.array(communitySchema).parse(response.data),
    page: pageInfoSchema.parse(response.meta.page),
  }
}
