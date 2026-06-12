import Image from "next/image";
import type { HeroContent } from "./types";

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
 * CTAs (cta_primary/cta_secondary) entram na fase da página institucional,
 * quando existirão âncoras de seção para apontar.
 */
export function HeroSection({ content }: { content: HeroContent }) {
  const { kicker, title, tagline, image, selo } = content;
  const hasImage = Boolean(image?.url);

  return (
    <section
      className="section-hero bg-background px-4 py-12 md:px-8 md:py-16 lg:py-24"
      aria-labelledby="hero-titulo"
    >
      <div className="mx-auto grid w-full max-w-6xl items-center gap-8 md:grid-cols-2 lg:gap-16">
        <div className="flex flex-col items-start gap-4">
          {kicker && (
            <p className="text-sm font-bold uppercase tracking-widest text-primary">
              {kicker}
            </p>
          )}
          <h1 id="hero-titulo" className="text-4xl text-foreground md:text-5xl">
            {title}
          </h1>
          {tagline && (
            <p className="max-w-prose text-lg text-muted">{tagline}</p>
          )}
          {selo && (
            <p className="rounded-theme-sm bg-secondary px-3 py-1 text-sm font-bold text-foreground">
              {selo}
            </p>
          )}
        </div>
        {hasImage && (
          <div className="relative aspect-[4/3] overflow-hidden rounded-theme shadow-theme">
            <Image
              src={image!.url!}
              alt={image!.alt_text}
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        )}
      </div>
    </section>
  );
}
