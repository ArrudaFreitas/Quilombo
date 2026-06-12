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
