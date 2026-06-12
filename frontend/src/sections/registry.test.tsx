import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PageSectionItem } from "@/lib/api/types";
import { renderSections } from "./registry";

const hero: PageSectionItem = {
  id: 1,
  sectionType: "hero",
  content: {
    kicker: "Comunidade quilombola",
    title: "Kalunga",
    tagline: "Chapada dos Veadeiros, Goiás.",
    selo: "Território certificado",
  },
};

afterEach(() => {
  vi.restoreAllMocks();
});

/*
 * Garantias do registry: o conteúdo vindo da API nunca quebra a página —
 * tipos desconhecidos são pulados e seção com conteúdo malformado é isolada
 * por error boundary.
 */
describe("renderSections", () => {
  it("renderiza seções registradas na ordem da API", () => {
    render(<>{renderSections([hero])}</>);
    expect(
      screen.getByRole("heading", { level: 1, name: "Kalunga" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Chapada dos Veadeiros, Goiás.")).toBeInTheDocument();
  });

  it("pula tipos de seção desconhecidos sem quebrar", () => {
    const desconhecida: PageSectionItem = {
      id: 99,
      sectionType: "tipo_futuro",
      content: {},
    };
    const nodes = renderSections([desconhecida, hero]);
    expect(nodes).toHaveLength(1);
  });

  it("isola seção com conteúdo malformado sem derrubar as demais", () => {
    // boundary loga o erro capturado; silencia para não poluir a saída
    vi.spyOn(console, "error").mockImplementation(() => {});
    const quebrada = {
      id: 2,
      sectionType: "hero",
      content: null,
    } as unknown as PageSectionItem;

    render(<>{renderSections([quebrada, hero])}</>);
    expect(
      screen.getByRole("heading", { level: 1, name: "Kalunga" }),
    ).toBeInTheDocument();
  });

  it("hero de referência não tem violações de acessibilidade (axe)", async () => {
    const { container } = render(<main>{renderSections([hero])}</main>);
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
