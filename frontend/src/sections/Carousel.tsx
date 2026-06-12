import type { CarouselContent } from "./types";
import { ContentImage, SectionHeader } from "./parts";

/**
 * Galeria horizontal. Sem JavaScript: scroll nativo com snap. A faixa é uma
 * região rolável focável (role="region" + tabIndex) para funcionar por teclado
 * (WCAG 2.1.1); em telas estreitas o usuário desliza, em largas rola.
 */
export function CarouselSection({ content }: { content: CarouselContent }) {
  const { kicker, title, cards } = content;

  return (
    <section className="section-carousel bg-background-subtle px-4 py-12 md:px-8 md:py-16">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <SectionHeader kicker={kicker} title={title} />
        <div
          role="region"
          aria-label={title}
          tabIndex={0}
          className="-mx-4 overflow-x-auto px-4 pb-4 md:-mx-8 md:px-8"
        >
          <ul className="flex snap-x snap-mandatory gap-4 md:gap-6">
            {(cards ?? []).map((card, index) => (
              <li
                key={index}
                className="w-72 shrink-0 snap-start overflow-hidden rounded-theme bg-surface-raised shadow-theme-sm md:w-80"
              >
                {card.image?.url && (
                  <ContentImage
                    image={card.image}
                    className="aspect-[4/3] w-full object-cover"
                  />
                )}
                <div className="flex flex-col gap-1 p-4">
                  <h3 className="text-lg text-foreground">{card.title}</h3>
                  {card.subtitle && (
                    <p className="text-sm text-subtle">{card.subtitle}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
