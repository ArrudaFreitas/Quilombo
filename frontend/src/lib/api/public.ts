import { apiFetch, type ApiFetchOptions } from "./client";
import type { ApiEnvelope, CommunityCard, CommunityPage } from "./types";

/** Endpoints públicos (sem autenticação). */

export interface CommunitiesQuery {
  /** Filtro por nome (busca do diretório). */
  name?: string;
  page?: number;
  size?: number;
}

/** GET /api/v1/communities — diretório público (paginado; meta.page presente). */
export function getCommunities(
  query: CommunitiesQuery = {},
  options?: ApiFetchOptions,
): Promise<ApiEnvelope<CommunityCard[]>> {
  const params = new URLSearchParams();
  if (query.name) params.set("name", query.name);
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.size !== undefined) params.set("size", String(query.size));
  const qs = params.size > 0 ? `?${params}` : "";
  return apiFetch<CommunityCard[]>(`/communities${qs}`, options);
}

/**
 * GET /api/v1/community — página institucional do tenant atual.
 * Server-side, passe `options.tenantHost` para o backend resolver o tenant.
 */
export function getCommunityPage(
  options?: ApiFetchOptions,
): Promise<ApiEnvelope<CommunityPage>> {
  return apiFetch<CommunityPage>("/community", options);
}
