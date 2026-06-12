import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import { fetchCommunities, fetchCommunityPage } from "@/lib/api/publicServer";
import { tenantSlugFromHost } from "@/lib/tenant";
import { DirectoryPage } from "@/components/directory/DirectoryPage";
import { CommunityView } from "@/components/community/CommunityView";

/**
 * Rota raiz com despacho por host (mesma app para os dois mundos):
 *   - domínio raiz  → diretório público de comunidades;
 *   - subdomínio    → página institucional do tenant.
 */

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ name?: string }>;
}

async function currentHost(): Promise<string> {
  const requestHeaders = await headers();
  return requestHeaders.get("host") ?? "";
}

export async function generateMetadata(): Promise<Metadata> {
  const host = await currentHost();
  const slug = tenantSlugFromHost(host);
  if (!slug) {
    return {
      title: "Quilombos do Brasil",
      description:
        "Conheça comunidades quilombolas, suas histórias, eventos e territórios.",
    };
  }
  try {
    const { data } = await fetchCommunityPage(host);
    return {
      title: data.community.name,
      description:
        data.card?.shortDescription ??
        `Página institucional da comunidade ${data.community.name}.`,
    };
  } catch {
    return { title: "Comunidade" };
  }
}

export default async function Home({ searchParams }: PageProps) {
  const host = await currentHost();
  const slug = tenantSlugFromHost(host);

  if (!slug) {
    const { name } = await searchParams;
    const { data } = await fetchCommunities(name, host);
    return <DirectoryPage communities={data} query={name ?? ""} host={host} />;
  }

  let page;
  try {
    page = (await fetchCommunityPage(host)).data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound(); // subdomínio não corresponde a nenhuma comunidade
    }
    throw error;
  }
  return <CommunityView page={page} host={host} />;
}
