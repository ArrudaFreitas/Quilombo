/**
 * Tipos de conteúdo das seções da página institucional.
 *
 * O backend guarda `content` como JSONB livre (page_sections.content); o shape
 * de cada tipo é definido aqui, no frontend — fonte: schemas do MVP
 * (sectionSchemas.js), que o painel admin reutilizará na fase de edição.
 *
 * As chaves usam snake_case porque é assim que o conteúdo é persistido.
 */

export const SECTION_TYPES = [
  "hero",
  "description_short",
  "description_long",
  "carousel",
  "events",
  "timeline",
  "location",
] as const;

export type SectionType = (typeof SECTION_TYPES)[number];

/** Nomes exibidos ao usuário (índice da página pública e painel admin). */
export const SECTION_TYPE_LABELS: Record<SectionType, string> = {
  hero: "Capa",
  description_short: "Apresentação",
  description_long: "Nossa história",
  carousel: "Galeria",
  events: "Eventos",
  timeline: "Linha do tempo",
  location: "Onde estamos",
};

/*
 * Helpers puros (sem React) — utilizáveis tanto em Server Components quanto
 * no cliente; o registry em si é client module (error boundary).
 */

/** Âncora da seção na página (alvo do índice de navegação). */
export function sectionAnchor(section: { id: number }): string {
  return `secao-${section.id}`;
}

/** O tipo é conhecido/renderizável? (filtra o índice de navegação) */
export function isRenderable(section: { sectionType: string }): boolean {
  return (SECTION_TYPES as readonly string[]).includes(section.sectionType);
}

/** Nome da seção para o índice/painel: título do conteúdo ou label do tipo. */
export function sectionLabel(section: {
  sectionType: string;
  content: Record<string, unknown>;
}): string {
  const title = section.content?.["title"];
  if (typeof title === "string" && title.trim()) {
    return title;
  }
  return (
    SECTION_TYPE_LABELS[section.sectionType as SectionType] ?? section.sectionType
  );
}

/** Referência a uma imagem do acervo. `alt_text` é obrigatório no upload. */
export interface ImageRef {
  url: string | null;
  alt_text: string;
}

export interface HeroContent {
  kicker?: string;
  title: string;
  tagline?: string;
  image?: ImageRef;
  cta_primary?: string;
  cta_secondary?: string;
  selo?: string;
}

export interface DescriptionShortContent {
  label?: string;
  body: string;
  portrait?: ImageRef;
}

export type RichBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "image"; image: ImageRef; caption?: string }
  | { type: "quote"; text: string; cite?: string };

export interface DescriptionLongContent {
  kicker?: string;
  title: string;
  blocks: RichBlock[];
}

export interface CarouselCard {
  title: string;
  subtitle?: string;
  image?: ImageRef;
}

export interface CarouselContent {
  kicker?: string;
  title: string;
  cards: CarouselCard[];
}

export interface EventItem {
  day: string;
  month: string;
  /** Data ISO (AAAA-MM-DD) para o atributo datetime de <time>. */
  datetime?: string;
  title: string;
  description?: string;
}

export interface EventsContent {
  kicker?: string;
  title: string;
  events: EventItem[];
}

export interface TimelineEntry {
  year: string;
  title: string;
  description?: string;
  is_recent?: boolean;
}

export interface TimelineContent {
  kicker?: string;
  title: string;
  entries: TimelineEntry[];
}

export interface LocationContent {
  kicker?: string;
  title: string;
  place_name?: string;
  address?: string;
  pills?: string[];
  cta_label?: string;
  map_image?: ImageRef;
}

/** Mapa tipo → shape do conteúdo, para tipar o registry. */
export interface SectionContentMap {
  hero: HeroContent;
  description_short: DescriptionShortContent;
  description_long: DescriptionLongContent;
  carousel: CarouselContent;
  events: EventsContent;
  timeline: TimelineContent;
  location: LocationContent;
}
