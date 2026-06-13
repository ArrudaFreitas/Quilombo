import type { LocationContent } from "./types";
import { ContentImage, SectionHeader } from "./parts";

/** Onde fica a comunidade: endereço, infos rápidas, mapa e rota. */
export function LocationSection({ content }: { content: LocationContent }) {
  const { kicker, title, place_name, address, pills, cta_label, map_image } =
    content;

  const mapsUrl = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : null;

  return (
    <section className="section-location px-4 py-12 md:px-8 md:py-16">
      <div className="mx-auto grid w-full max-w-5xl gap-8 md:grid-cols-2 md:gap-12">
        <div className="flex flex-col items-start gap-4">
          <SectionHeader kicker={kicker} title={title} />
          {place_name && (
            <p className="text-xl font-bold text-foreground">{place_name}</p>
          )}
          {address && (
            <address className="max-w-prose not-italic text-muted">
              {address}
            </address>
          )}
          {pills && pills.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {pills.map((pill, index) => (
                <li
                  key={index}
                  className="rounded-theme-sm bg-secondary px-3 py-1 text-sm font-bold text-foreground"
                >
                  {pill}
                </li>
              ))}
            </ul>
          )}
          {mapsUrl && (
            <a
              href={mapsUrl}
              className="mt-2 inline-block rounded-theme-sm bg-primary px-5 py-3 font-bold text-on-primary hover:bg-primary-strong"
            >
              {cta_label || "Como chegar"}
            </a>
          )}
        </div>
        {map_image?.url && (
          <ContentImage
            image={map_image}
            className="aspect-[4/3] w-full rounded-theme object-cover shadow-theme"
          />
        )}
      </div>
    </section>
  );
}
