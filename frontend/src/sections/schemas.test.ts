import { describe, expect, it } from "vitest";
import { defaultContentFor, SECTION_SCHEMAS } from "./schemas";
import { SECTION_TYPES } from "./types";

/*
 * Os schemas guiam o editor do admin: todo tipo de seção precisa de schema,
 * e o defaultContent precisa cobrir os campos declarados — uma seção recém
 * criada nunca nasce com campo indefinido.
 */
describe("SECTION_SCHEMAS", () => {
  it("cobre todos os tipos de seção do catálogo", () => {
    for (const type of SECTION_TYPES) {
      expect(SECTION_SCHEMAS[type], `schema de ${type}`).toBeDefined();
      expect(SECTION_SCHEMAS[type].type).toBe(type);
    }
  });

  it("defaultContent tem entrada para cada campo do schema", () => {
    for (const type of SECTION_TYPES) {
      const schema = SECTION_SCHEMAS[type];
      for (const field of schema.fields) {
        expect(
          Object.hasOwn(schema.defaultContent, field.key),
          `${type}.defaultContent.${field.key}`,
        ).toBe(true);
      }
    }
  });

  it("defaultContentFor devolve um clone independente", () => {
    const a = defaultContentFor("hero");
    const b = defaultContentFor("hero");
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
    (a as { title: string }).title = "mudou";
    expect((b as { title: string }).title).toBe("");
  });
});
