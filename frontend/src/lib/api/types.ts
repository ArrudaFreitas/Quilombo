/**
 * Contratos da API (/api/v1) — espelham os records do backend.
 *
 * Sucesso: envelope `{ data, meta }` (com.quilombo.common.api.ApiResponse).
 * Erro: RFC 7807 / ProblemDetail, sem envelope.
 */

/** Metadados de paginação (meta.page), presente só em respostas paginadas. */
export interface PageMeta {
  size: number;
  number: number;
  totalElements: number;
  totalPages: number;
}

export interface Meta {
  timestamp: string;
  page?: PageMeta;
}

export interface ApiEnvelope<T> {
  data: T;
  meta: Meta;
}

/** Erro RFC 7807 (Spring ProblemDetail). */
export interface ProblemDetail {
  type?: string;
  title?: string;
  status: number;
  detail?: string;
  instance?: string;
  [extension: string]: unknown;
}

/* ── DTOs públicos ─────────────────────────────────────────────────────── */

/** Item de GET /api/v1/communities (CommunityCardResponse). */
export interface CommunityCard {
  slug: string;
  name: string;
  location: string;
  imageUrl: string | null;
  shortDescription: string | null;
}

/** Seção em GET /api/v1/community (CommunityPageResponse.SectionItem). */
export interface PageSectionItem {
  id: number;
  sectionType: string;
  content: Record<string, unknown>;
}

/** GET /api/v1/community (CommunityPageResponse). */
export interface CommunityPage {
  community: {
    slug: string;
    name: string;
    location: string;
  };
  /** `null` enquanto o admin não preencher o perfil. */
  card: {
    imageUrl: string | null;
    shortDescription: string | null;
  } | null;
  page: {
    style: string;
    palette: string;
  };
  sections: PageSectionItem[];
}
