import type { DescriptionLongContent, RichBlock } from "./types";
import { ContentImage, SectionHeader } from "./parts";

/**
 * Narrativa longa: blocos livres (parágrafo, subtítulo, imagem com legenda,
 * citação) em qualquer ordem. Bloco de tipo desconhecido é ignorado — conteúdo
 * de versões futuras não quebra a página.
 */
export function DescriptionLongSection({
  content,
}: {
  content: DescriptionLongContent;
}) {
  const { kicker, title, blocks } = content;

  return (
    <section className="section-description-long px-4 py-12 md:px-8 md:py-16">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <SectionHeader kicker={kicker} title={title} />
        {(blocks ?? []).map((block, index) => (
          <RichBlockView key={index} block={block} />
        ))}
      </div>
    </section>
  );
}

function RichBlockView({ block }: { block: RichBlock }) {
  switch (block.type) {
    case "paragraph":
      return <p className="max-w-prose text-lg text-muted">{block.text}</p>;
    case "heading":
      return <h3 className="mt-4 text-2xl text-foreground">{block.text}</h3>;
    case "image":
      return (
        <figure className="my-2 flex flex-col gap-2">
          <ContentImage
            image={block.image}
            className="w-full rounded-theme object-cover shadow-theme-sm"
          />
          {block.caption && (
            <figcaption className="text-sm text-subtle">
              {block.caption}
            </figcaption>
          )}
        </figure>
      );
    case "quote":
      return (
        <figure className="my-2 border-l-4 border-primary pl-4 md:pl-6">
          <blockquote>
            <p className="font-display text-xl text-foreground md:text-2xl">
              {block.text}
            </p>
          </blockquote>
          {block.cite && (
            <figcaption className="mt-2 text-sm text-subtle">
              — {block.cite}
            </figcaption>
          )}
        </figure>
      );
    default:
      return null;
  }
}
