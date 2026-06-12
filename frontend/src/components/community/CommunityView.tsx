import type { CommunityPage } from "@/lib/api/types";
import { rootHost } from "@/lib/tenant";
import { isRenderable, sectionAnchor, sectionLabel } from "@/sections/types";
import { SectionsView } from "@/sections/registry";

/**
 * Página institucional do tenant. O wrapper aplica data-style/data-palette
 * vindos da API — toda a aparência reage por tokens; o conteúdo e o markup
 * são os mesmos para qualquer combinação de tema (contrato de desacoplamento).
 */
export function CommunityView({
  page,
  host,
}: {
  page: CommunityPage;
  host: string;
}) {
  const { community, page: config, sections } = page;
  const visible = sections.filter(isRenderable);
  const hasHero = visible.some((section) => section.sectionType === "hero");

  return (
    <div
      data-style={config.style}
      data-palette={config.palette}
      className="flex min-h-dvh flex-col bg-background"
    >
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 md:px-8">
          <a
            href={`https://${rootHost(host)}`}
            className="text-sm font-bold text-primary hover:text-primary-strong"
          >
            ← Todas as comunidades
          </a>
          <p className="font-display font-bold text-foreground">
            {community.name}
          </p>
        </div>
        {visible.length > 1 && (
          <nav
            aria-label="Seções desta página"
            className="mx-auto w-full max-w-6xl overflow-x-auto px-4 pb-3 md:px-8"
          >
            <ul className="flex gap-4 whitespace-nowrap">
              {visible.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${sectionAnchor(section)}`}
                    className="text-sm text-muted underline-offset-4 hover:text-primary hover:underline"
                  >
                    {sectionLabel(section)}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </header>

      <main id="conteudo" className="flex-1">
        {!hasHero && (
          <section className="px-4 py-12 md:px-8 md:py-16">
            <div className="mx-auto w-full max-w-6xl">
              <h1 className="text-4xl text-foreground md:text-5xl">
                {community.name}
              </h1>
              <p className="mt-2 text-lg text-muted">{community.location}</p>
            </div>
          </section>
        )}
        {visible.length === 0 && (
          <section className="px-4 py-12 md:px-8">
            <div className="mx-auto w-full max-w-6xl">
              <p className="max-w-prose text-lg text-muted">
                Esta comunidade ainda está montando sua página. Volte em breve!
              </p>
            </div>
          </section>
        )}
        <SectionsView sections={visible} />
      </main>

      <footer className="border-t border-border bg-surface px-4 py-6 md:px-8">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 text-sm text-subtle">
          <p>
            {community.name} · {community.location}
          </p>
          <a href="/admin" className="hover:text-primary hover:underline">
            Área administrativa
          </a>
        </div>
      </footer>
    </div>
  );
}
