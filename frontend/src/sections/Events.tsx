import type { EventsContent } from "./types";
import { SectionHeader } from "./parts";

/** Agenda de eventos: data destacada + título + descrição. */
export function EventsSection({ content }: { content: EventsContent }) {
  const { kicker, title, events } = content;

  return (
    <section className="section-events px-4 py-12 md:px-8 md:py-16">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <SectionHeader kicker={kicker} title={title} />
        <ul className="flex flex-col gap-4">
          {(events ?? []).map((event, index) => (
            <li
              key={index}
              className="flex items-start gap-4 rounded-theme bg-surface-raised p-4 shadow-theme-sm md:gap-6 md:p-6"
            >
              <time
                dateTime={event.datetime || undefined}
                className="flex w-16 shrink-0 flex-col items-center rounded-theme-sm bg-primary px-2 py-2 text-on-primary"
              >
                <span className="text-2xl font-bold leading-none">
                  {event.day}
                </span>
                <span className="text-sm uppercase">{event.month}</span>
              </time>
              <div className="flex flex-col gap-1">
                <h3 className="text-xl text-foreground">{event.title}</h3>
                {event.description && (
                  <p className="text-muted">{event.description}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
