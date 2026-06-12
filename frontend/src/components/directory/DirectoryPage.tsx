import type { CommunityCard } from "@/lib/api/types";
import { tenantHost } from "@/lib/tenant";
import { SearchForm } from "./SearchForm";

/** Diretório público de comunidades (domínio raiz). */
export function DirectoryPage({
  communities,
  query,
  host,
}: {
  communities: CommunityCard[];
  query: string;
  host: string;
}) {
  return (
    <>
      <header className="bg-primary px-4 py-12 text-on-primary md:px-8 md:py-16">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
          <p className="text-sm font-bold uppercase tracking-widest">
            Quilombos do Brasil
          </p>
          <h1 className="max-w-2xl text-4xl md:text-5xl">
            Conheça as comunidades, suas histórias e territórios
          </h1>
          <p className="max-w-prose text-lg opacity-90">
            Cada comunidade mantém sua própria página: memória, eventos,
            imagens e como chegar.
          </p>
        </div>
      </header>

      <main
        id="conteudo"
        className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-10 md:px-8"
      >
        <SearchForm initialQuery={query} />

        <p className="text-muted" role="status">
          {communities.length === 0
            ? "Nenhuma comunidade encontrada."
            : `${communities.length} ${communities.length === 1 ? "comunidade encontrada" : "comunidades encontradas"}.`}
        </p>

        {communities.length > 0 && (
          <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {communities.map((community) => (
              <li key={community.slug}>
                <DirectoryCard community={community} host={host} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}

/**
 * Card do diretório — link para o subdomínio da comunidade. O card inteiro é
 * um único link com nome acessível = nome da comunidade.
 */
function DirectoryCard({
  community,
  host,
}: {
  community: CommunityCard;
  host: string;
}) {
  return (
    <a
      href={`https://${tenantHost(community.slug, host)}`}
      className="flex h-full flex-col overflow-hidden rounded-theme bg-surface-raised shadow-theme-sm transition-shadow hover:shadow-theme"
    >
      {community.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={community.imageUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="aspect-[3/2] w-full object-cover"
        />
      ) : (
        <div
          aria-hidden="true"
          className="flex aspect-[3/2] w-full items-center justify-center bg-secondary"
        >
          <span className="font-display text-5xl text-primary">
            {community.name.charAt(0)}
          </span>
        </div>
      )}
      <span className="flex flex-1 flex-col gap-1 p-4">
        <span className="font-display text-xl font-bold text-foreground">
          {community.name}
        </span>
        <span className="text-sm text-subtle">{community.location}</span>
        {community.shortDescription && (
          <span className="mt-1 text-sm text-muted">
            {community.shortDescription}
          </span>
        )}
      </span>
    </a>
  );
}
