"use client";

import { Component, type ComponentType, type ReactNode } from "react";
import type { PageSectionItem } from "@/lib/api/types";
import {
  sectionAnchor,
  type SectionContentMap,
  type SectionType,
} from "./types";
import { HeroSection } from "./Hero";
import { DescriptionShortSection } from "./DescriptionShort";
import { DescriptionLongSection } from "./DescriptionLong";
import { CarouselSection } from "./Carousel";
import { EventsSection } from "./Events";
import { TimelineSection } from "./Timeline";
import { LocationSection } from "./Location";

/**
 * Registro de seções — único ponto a tocar para adicionar um tipo novo:
 *
 *   1. Defina o shape do conteúdo em types.ts (e adicione ao SectionContentMap);
 *   2. Crie o componente em src/sections/ consumindo apenas tokens do tema
 *      (utilitários Tailwind semânticos) e markup semântico/AA;
 *   3. Registre-o no mapa abaixo (e o label em SECTION_TYPE_LABELS).
 *
 * Garantias de robustez (o conteúdo nunca quebra a página):
 *   - tipo desconhecido (ex.: seção nova ainda sem componente) é ignorado;
 *   - erro de render de uma seção (conteúdo malformado) derruba só ela,
 *     nunca a página — cada seção é isolada por um error boundary.
 *
 * Client module: error boundary exige class component. O HTML continua sendo
 * gerado no servidor (client components são pré-renderizados).
 */

type SectionComponents = {
  [K in SectionType]?: ComponentType<{ content: SectionContentMap[K] }>;
};

const SECTION_COMPONENTS: SectionComponents = {
  hero: HeroSection,
  description_short: DescriptionShortSection,
  description_long: DescriptionLongSection,
  carousel: CarouselSection,
  events: EventsSection,
  timeline: TimelineSection,
  location: LocationSection,
};

/** Renderiza uma seção vinda da API; `null` para tipo não suportado. */
export function renderSection(section: PageSectionItem): ReactNode {
  const SectionComponent = SECTION_COMPONENTS[section.sectionType as SectionType] as
    | ComponentType<{ content: unknown }>
    | undefined;
  if (!SectionComponent) {
    return null;
  }
  return (
    <SectionErrorBoundary key={section.id}>
      <div id={sectionAnchor(section)} className="scroll-mt-24">
        <SectionComponent content={section.content} />
      </div>
    </SectionErrorBoundary>
  );
}

/** Renderiza a lista de seções da página (ordem da API), pulando as não suportadas. */
export function renderSections(sections: PageSectionItem[]): ReactNode[] {
  return sections.map(renderSection).filter((node) => node !== null);
}

/** Ponte para Server Components: a página pública passa as seções da API. */
export function SectionsView({ sections }: { sections: PageSectionItem[] }) {
  return <>{renderSections(sections)}</>;
}

class SectionErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
