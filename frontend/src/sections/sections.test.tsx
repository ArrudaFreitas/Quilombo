import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { describe, expect, it } from "vitest";
import type { PageSectionItem } from "@/lib/api/types";
import { renderSections } from "./registry";

/*
 * Os 7 tipos de seção renderizam conteúdo realista com markup semântico e sem
 * violações de acessibilidade (axe). Campos opcionais ausentes não quebram.
 */

const sections: PageSectionItem[] = [
  {
    id: 1,
    sectionType: "hero",
    content: {
      kicker: "Comunidade quilombola",
      title: "Kalunga",
      tagline: "Há mais de 200 anos guardando a Chapada.",
      selo: "Território certificado",
    },
  },
  {
    id: 2,
    sectionType: "description_short",
    content: { label: "Quem somos", body: "Somos guardiões das águas e do cerrado." },
  },
  {
    id: 3,
    sectionType: "description_long",
    content: {
      kicker: "Nossa história",
      title: "Do refúgio ao território",
      blocks: [
        { type: "paragraph", text: "Famílias chegaram à Chapada no século XVIII." },
        { type: "heading", text: "O reconhecimento" },
        { type: "quote", text: "A terra foi lembrada até virar documento.", cite: "Seu Antônio" },
        { type: "tipo_futuro", qualquer: "coisa" }, // ignorado sem quebrar
      ],
    },
  },
  {
    id: 4,
    sectionType: "carousel",
    content: {
      kicker: "Dia a dia",
      title: "A vida na comunidade",
      cards: [{ title: "A frota volta antes do meio-dia", subtitle: "2025" }],
    },
  },
  {
    id: 5,
    sectionType: "events",
    content: {
      title: "Próximos encontros",
      events: [
        {
          day: "29",
          month: "Jun",
          datetime: "2026-06-29",
          title: "Festa de São Pedro",
          description: "A procissão de barcos abençoa a maré.",
        },
      ],
    },
  },
  {
    id: 6,
    sectionType: "timeline",
    content: {
      title: "Nossa caminhada",
      entries: [
        { year: "1888", title: "A permanência" },
        { year: "2026", title: "Hoje", is_recent: true },
      ],
    },
  },
  {
    id: 7,
    sectionType: "location",
    content: {
      title: "Onde estamos",
      place_name: "Sítio Histórico Kalunga",
      address: "Cavalcante – GO",
      pills: ["Visitas guiadas"],
      cta_label: "Como chegar",
    },
  },
];

describe("seções da página institucional", () => {
  it("renderiza os 7 tipos com a estrutura de headings correta", () => {
    render(<main>{renderSections(sections)}</main>);

    // hero é o único h1; as demais seções usam h2
    expect(screen.getByRole("heading", { level: 1, name: "Kalunga" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Do refúgio ao território" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "A vida na comunidade" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Próximos encontros" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Nossa caminhada" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Onde estamos" })).toBeInTheDocument();

    // conteúdos específicos
    expect(screen.getByText("Somos guardiões das águas e do cerrado.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Como chegar" })).toHaveAttribute(
      "href",
      expect.stringContaining("google.com/maps"),
    );
    // bloco de tipo futuro foi ignorado
    expect(screen.queryByText("coisa")).not.toBeInTheDocument();
  });

  it("não tem violações de acessibilidade (axe)", async () => {
    const { container } = render(<main>{renderSections(sections)}</main>);
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
