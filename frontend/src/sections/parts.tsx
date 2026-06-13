import type { ImageRef } from "./types";

/**
 * Peças compartilhadas pelas seções. Markup estável e semântico; aparência
 * só por tokens — o contrato de desacoplamento vale aqui também.
 */

/** Cabeçalho padrão de seção: kicker opcional + título (h2). */
export function SectionHeader({
  kicker,
  title,
}: {
  kicker?: string;
  title: string;
}) {
  return (
    <header className="flex flex-col gap-2">
      {kicker && (
        <p className="text-sm font-bold uppercase tracking-widest text-primary">
          {kicker}
        </p>
      )}
      <h2 className="text-3xl text-foreground md:text-4xl">{title}</h2>
    </header>
  );
}

/**
 * Imagem de conteúdo do acervo. <img> nativo de propósito: o backend já
 * entrega WebP redimensionado (≤1920px), e o otimizador do next/image exigiria
 * allowlist do host do bucket por ambiente. `alt` vem do acervo (obrigatório
 * no upload — WCAG 1.1.1).
 */
export function ContentImage({
  image,
  className,
}: {
  image: ImageRef;
  className?: string;
}) {
  if (!image.url) {
    return null;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={image.url}
      alt={image.alt_text}
      loading="lazy"
      decoding="async"
      className={className}
    />
  );
}
