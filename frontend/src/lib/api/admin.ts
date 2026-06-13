import type { ApiFetchOptions } from "./client";
import type {
  AdminCard,
  AdminImage,
  AdminPage,
  ApiEnvelope,
  StorageUsage,
  StylesCatalog,
} from "./types";

/**
 * Endpoints administrativos (/api/v1/admin). Todas as funções recebem um
 * `fetcher` — o `adminFetch` de useAdminSession, que injeta o Bearer e
 * renova a sessão automaticamente em 401.
 */
export type AdminFetcher = <T>(
  path: string,
  options?: ApiFetchOptions,
) => Promise<ApiEnvelope<T>>;

/* ── Card da comunidade ────────────────────────────────────────────────── */

export function getCard(fetcher: AdminFetcher) {
  return fetcher<AdminCard>("/admin/card");
}

export function updateCard(
  fetcher: AdminFetcher,
  body: { imageUrl: string | null; shortDescription: string | null },
) {
  return fetcher<AdminCard>("/admin/card", { method: "PUT", body });
}

/* ── Página: estilos e seções ──────────────────────────────────────────── */

export function getStyles(fetcher: AdminFetcher) {
  return fetcher<StylesCatalog>("/admin/styles");
}

export function getPage(fetcher: AdminFetcher) {
  return fetcher<AdminPage>("/admin/page");
}

export function updateStyle(
  fetcher: AdminFetcher,
  body: { style: string; palette: string },
) {
  return fetcher<AdminPage>("/admin/page/style", { method: "PUT", body });
}

export function createSection(
  fetcher: AdminFetcher,
  body: { sectionType: string; content?: Record<string, unknown> },
) {
  return fetcher<AdminPage>("/admin/sections", { method: "POST", body });
}

export function updateSectionContent(
  fetcher: AdminFetcher,
  id: number,
  content: Record<string, unknown>,
) {
  return fetcher<AdminPage>(`/admin/sections/${id}`, {
    method: "PUT",
    body: { content },
  });
}

/** A posição de cada id na lista vira o novo order_index. */
export function reorderSections(fetcher: AdminFetcher, ids: number[]) {
  return fetcher<AdminPage>("/admin/sections/reorder", {
    method: "PUT",
    body: { ids },
  });
}

export function toggleSection(fetcher: AdminFetcher, id: number) {
  return fetcher<AdminPage>(`/admin/sections/${id}/toggle`, { method: "PATCH" });
}

export function deleteSection(fetcher: AdminFetcher, id: number) {
  return fetcher<AdminPage>(`/admin/sections/${id}`, { method: "DELETE" });
}

/* ── Acervo de imagens ─────────────────────────────────────────────────── */

export function getImages(fetcher: AdminFetcher) {
  return fetcher<AdminImage[]>("/admin/images");
}

export function uploadImage(fetcher: AdminFetcher, file: File, altText: string) {
  const form = new FormData();
  form.append("file", file);
  form.append("altText", altText);
  return fetcher<AdminImage>("/admin/upload", { method: "POST", body: form });
}

export function updateAltText(
  fetcher: AdminFetcher,
  filename: string,
  altText: string,
) {
  return fetcher<AdminImage>(`/admin/images/${encodeURIComponent(filename)}/alt`, {
    method: "PUT",
    body: { altText },
  });
}

export function deleteImage(fetcher: AdminFetcher, filename: string) {
  return fetcher<void>(`/admin/images/${encodeURIComponent(filename)}`, {
    method: "DELETE",
  });
}

export function getStorageUsage(fetcher: AdminFetcher) {
  return fetcher<StorageUsage>("/admin/storage");
}
