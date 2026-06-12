import type { DescriptionShortContent } from "./types";
import { ContentImage } from "./parts";

/** Apresentação curta: frase de destaque em fonte grande + retrato opcional. */
export function DescriptionShortSection({
  content,
}: {
  content: DescriptionShortContent;
}) {
  const { label, body, portrait } = content;

  return (
    <section className="section-description-short bg-background-subtle px-4 py-12 md:px-8 md:py-16">
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-8 md:flex-row md:gap-12">
        {portrait?.url && (
          <ContentImage
            image={portrait}
            className="size-40 shrink-0 rounded-full object-cover shadow-theme-sm md:size-48"
          />
        )}
        <div className="flex flex-col gap-3 text-center md:text-left">
          {label && (
            <h2 className="text-sm font-bold uppercase tracking-widest text-primary">
              {label}
            </h2>
          )}
          <p className="font-display text-2xl leading-snug text-foreground md:text-3xl">
            {body}
          </p>
        </div>
      </div>
    </section>
  );
}
