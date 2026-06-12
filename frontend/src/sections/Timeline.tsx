import type { TimelineContent } from "./types";
import { SectionHeader } from "./parts";

/**
 * Cronologia da comunidade. <ol>: a ordem dos marcos é semântica. O destaque
 * "recente" usa cor E texto do marco — nada comunicado só por cor (WCAG 1.4.1).
 */
export function TimelineSection({ content }: { content: TimelineContent }) {
  const { kicker, title, entries } = content;

  return (
    <section className="section-timeline bg-background-subtle px-4 py-12 md:px-8 md:py-16">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <SectionHeader kicker={kicker} title={title} />
        <ol className="flex flex-col gap-0 border-l-2 border-border-strong pl-6 md:pl-8">
          {(entries ?? []).map((entry, index) => (
            <li key={index} className="relative pb-8 last:pb-0">
              <span
                aria-hidden="true"
                className={`absolute -left-6 top-1 ml-[-5px] size-3 rounded-full md:-left-8 ${
                  entry.is_recent ? "bg-accent" : "bg-primary"
                }`}
              />
              <p
                className={`font-display text-lg font-bold ${
                  entry.is_recent ? "text-accent" : "text-primary"
                }`}
              >
                {entry.year}
              </p>
              <h3 className="text-xl text-foreground">{entry.title}</h3>
              {entry.description && (
                <p className="mt-1 max-w-prose text-muted">{entry.description}</p>
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
