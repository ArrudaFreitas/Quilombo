import { z } from 'zod'
import { clientFetch } from './client'

/**
 * API da página pública de uma comunidade (o tenant atual). Chamada do **browser**
 * (same-origin via nginx, que preserva o Host do subdomínio para o backend resolver
 * o tenant) — o mesmo caminho da camada de auth do cliente. Buscar no servidor não
 * serve aqui: o `fetch` do Node descarta o header `Host`, então o tenant se perderia.
 * Contrato: GET /api/v1/community → { data: CommunityPage }. Slug inexistente →
 * `ApiError` 404.
 */

const communityPageSchema = z.object({
  community: z.object({
    slug: z.string(),
    name: z.string(),
    location: z.string(),
  }),
  // `null` enquanto o admin não preenche o perfil (imagem/descrição).
  card: z
    .object({
      imageUrl: z.string().nullable().default(null),
      imageAltText: z.string().nullable().default(null),
      shortDescription: z.string().nullable().default(null),
    })
    .nullable()
    .default(null),
  page: z.object({
    style: z.string(),
    palette: z.string(),
  }),
  // conteúdo das seções é JSONB livre — validado só na forma (a renderização
  // institucional rica é de uma etapa futura; ver styles/institutional).
  sections: z
    .array(
      z.object({
        id: z.number().int(),
        sectionType: z.string(),
        content: z.record(z.string(), z.unknown()).default({}),
      }),
    )
    .default([]),
})

export type CommunityPage = z.infer<typeof communityPageSchema>

/**
 * Página institucional pública do tenant atual. Lança `ApiError` (404 quando o
 * slug não existe) ou `ZodError` (resposta inesperada).
 */
export async function getCommunityPage(): Promise<CommunityPage> {
  const res = await clientFetch<unknown>('/community')
  return communityPageSchema.parse(res.data)
}
