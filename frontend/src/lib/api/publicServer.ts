import "server-only";

import { cache } from "react";
import { serverApiFetch } from "./server";
import type { ApiEnvelope, CommunityCard, CommunityPage } from "./types";

/**
 * Leituras públicas para Server Components. `cache` deduplica a chamada
 * dentro da mesma requisição (página + generateMetadata).
 */

export const fetchCommunityPage = cache(
  (tenantHost: string): Promise<ApiEnvelope<CommunityPage>> =>
    serverApiFetch<CommunityPage>("/community", { tenantHost }),
);

export const fetchCommunities = cache(
  (name: string | undefined, host: string): Promise<ApiEnvelope<CommunityCard[]>> => {
    const params = new URLSearchParams();
    if (name) params.set("name", name);
    const qs = params.size > 0 ? `?${params}` : "";
    return serverApiFetch<CommunityCard[]>(`/communities${qs}`, {
      tenantHost: host,
    });
  },
);
