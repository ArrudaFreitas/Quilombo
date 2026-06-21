import { z } from 'zod'
import { clientFetch } from '../client'

/**
 * API da página institucional no painel ({@code /api/v1/admin}, Bearer do tenant).
 * O catálogo de estilos/paletas vive no front (page-styles); aqui tratamos a
 * configuração (estilo+paleta) e o CRUD de seções. **Toda mutação devolve a
 * página completa** (com seções inativas) — fonte única de verdade do editor.
 * Conteúdo de seção é JSON livre (validado só na forma). camelCase + zod.
 */

const sectionSchema = z.object({
  id: z.number().int(),
  sectionType: z.string(),
  orderIndex: z.number().int(),
  active: z.boolean(),
  content: z.record(z.string(), z.unknown()).default({}),
})

export type AdminSection = z.infer<typeof sectionSchema>

const pageSchema = z.object({
  style: z.string(),
  palette: z.string(),
  sections: z.array(sectionSchema).default([]),
})

export type AdminPage = z.infer<typeof pageSchema>

/** Conteúdo livre de uma seção (chaves definidas pelo schema do tipo). */
export type SectionContent = Record<string, unknown>

/** Configuração + seções (inclusive inativas) do tenant. */
export async function getPage(token: string): Promise<AdminPage> {
  const res = await clientFetch<unknown>('/admin/page', { token })
  return pageSchema.parse(res.data)
}

/** Troca estilo e paleta; devolve a página atualizada. */
export async function updateStyle(
  token: string,
  style: string,
  palette: string,
): Promise<AdminPage> {
  const res = await clientFetch<unknown>('/admin/page/style', {
    method: 'PUT',
    token,
    body: JSON.stringify({ style, palette }),
  })
  return pageSchema.parse(res.data)
}

/** Cria uma seção (no fim da ordem) com o conteúdo informado. */
export async function createSection(
  token: string,
  sectionType: string,
  content: SectionContent,
): Promise<AdminPage> {
  const res = await clientFetch<unknown>('/admin/sections', {
    method: 'POST',
    token,
    body: JSON.stringify({ sectionType, content }),
  })
  return pageSchema.parse(res.data)
}

/** Substitui o documento de conteúdo de uma seção. */
export async function updateSectionContent(
  token: string,
  id: number,
  content: SectionContent,
): Promise<AdminPage> {
  const res = await clientFetch<unknown>(`/admin/sections/${id}`, {
    method: 'PUT',
    token,
    body: JSON.stringify({ content }),
  })
  return pageSchema.parse(res.data)
}

/** Alterna a visibilidade (ativa/inativa) de uma seção. */
export async function toggleSection(
  token: string,
  id: number,
): Promise<AdminPage> {
  const res = await clientFetch<unknown>(`/admin/sections/${id}/toggle`, {
    method: 'PATCH',
    token,
  })
  return pageSchema.parse(res.data)
}

/** Reordena em lote — a posição de cada id na lista vira a nova ordem. */
export async function reorderSections(
  token: string,
  ids: number[],
): Promise<AdminPage> {
  const res = await clientFetch<unknown>('/admin/sections/reorder', {
    method: 'PUT',
    token,
    body: JSON.stringify({ ids }),
  })
  return pageSchema.parse(res.data)
}

/** Remove uma seção; devolve a página atualizada. */
export async function deleteSection(
  token: string,
  id: number,
): Promise<AdminPage> {
  const res = await clientFetch<unknown>(`/admin/sections/${id}`, {
    method: 'DELETE',
    token,
  })
  return pageSchema.parse(res.data)
}
