import { Component, type ComponentType, type ReactNode } from "react";
import type { PageSectionItem } from "@/lib/api/types";
import type { SectionContentMap, SectionType } from "./types";
import { HeroSection } from "./Hero";

/**
 * Registro de seções — único ponto a tocar para adicionar um tipo novo:
 *
 *   1. Defina o shape do conteúdo em types.ts (e adicione ao SectionContentMap);
 *   2. Crie o componente em src/sections/ consumindo apenas tokens do tema
 *      (utilitários Tailwind semânticos) e markup semântico/AA;
 *   3. Registre-o no mapa abaixo.
 *
 * Garantias de robustez (o conteúdo nunca quebra a página):
 *   - tipo desconhecido (ex.: seção nova ainda sem componente) é ignorado;
 *   - erro de render de uma seção (conteúdo malformado) derruba só ela,
 *     nunca a página — cada seção é isolada por um error boundary.
 */

type SectionComponents = {
  [K in SectionType]?: ComponentType<{ content: SectionContentMap[K] }>;
};

const SECTION_COMPONENTS: SectionComponents = {
  hero: HeroSection,
  // description_short, description_long, carousel, events, timeline, location:
  // implementados na fase de visualização da página institucional.
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
      <SectionComponent content={section.content} />
    </SectionErrorBoundary>
  );
}

/** Renderiza a lista de seções da página (ordem da API), pulando as não suportadas. */
export function renderSections(sections: PageSectionItem[]): ReactNode[] {
  return sections.map(renderSection).filter((node) => node !== null);
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
