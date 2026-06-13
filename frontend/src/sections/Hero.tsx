import type { HeroContent } from "./types";
import { ContentImage } from "./parts";

/**
 * Seção hero — implementação de referência do padrão de seção:
 *
 * - markup semântico e estável: independe de estilo/paleta (WCAG 1.3.1);
 * - aparência só por tokens (utilitários semânticos: bg-primary, text-muted,
 *   rounded-theme…) — estilos podem refinar via [data-style] .section-hero;
 * - responsivo mobile-first em 3 breakpoints (base, md, lg) e funcional em
 *   reflow de 320px / zoom 200% (WCAG 1.4.10): nada de altura/largura fixa;
 * - campos opcionais ausentes simplesmente não renderizam — o conteúdo nunca
 *   quebra a seção.
 *
 * Único h1 da página institucional; as demais seções usam h2.
 */
export function HeroSection({ content }: { content: HeroContent }) {
  const { kicker, title, tagline, image, selo } = content;

  return (
    <section className="section-hero px-4 py-12 md:px-8 md:py-16 lg:py-20">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-8 md:grid-cols-2 lg:gap-16">
        <div className="flex flex-col items-start gap-4">
          {kicker && (
            <p className="text-sm font-bold uppercase tracking-widest text-primary">
              {kicker}
            </p>
          )}
          <h1 className="text-4xl text-foreground md:text-5xl">{title}</h1>
          {tagline && (
            <p className="max-w-prose text-lg text-muted">{tagline}</p>
          )}
          {selo && (
            <p className="rounded-theme-sm bg-secondary px-3 py-1 text-sm font-bold text-foreground">
              {selo}
            </p>
          )}
        </div>
        {image?.url && (
          <ContentImage
            image={image}
            className="aspect-[4/3] w-full rounded-theme object-cover shadow-theme"
          />
        )}
      </div>
    </section>
  );
}
