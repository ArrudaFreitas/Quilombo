import { describe, expect, it } from "vitest";
import { resolveCallback } from "./loginFlow";

/*
 * O /auth/callback decide entre: trocar o código (no subdomínio), encaminhar
 * ao subdomínio de origem (na raiz, via cookie) ou falhar com mensagem clara.
 */
describe("resolveCallback", () => {
  it("no subdomínio, troca o código direto", () => {
    expect(
      resolveCallback("kalunga.quilombo.localhost:8080", "abc123", null, "https:"),
    ).toEqual({ kind: "exchange", code: "abc123" });
  });

  it("na raiz com cookie, encaminha ao subdomínio preservando porta e código", () => {
    expect(
      resolveCallback("quilombo.localhost:8080", "abc 123", "kalunga", "https:"),
    ).toEqual({
      kind: "forward",
      url: "https://kalunga.quilombo.localhost:8080/auth/callback?code=abc%20123",
    });
  });

  it("sem código é erro de link inválido", () => {
    expect(
      resolveCallback("quilombo.localhost", null, "kalunga", "https:"),
    ).toEqual({ kind: "error", reason: "missing-code" });
  });

  it("na raiz sem cookie não há como saber o tenant", () => {
    expect(resolveCallback("quilombo.localhost", "abc", null, "https:")).toEqual({
      kind: "error",
      reason: "unknown-tenant",
    });
  });
});
