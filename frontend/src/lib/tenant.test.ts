import { describe, expect, it } from "vitest";
import { rootHost, tenantHost, tenantSlugFromHost } from "./tenant";

/*
 * Regras de resolução de tenant (espelham o TenantInterceptor do backend):
 * subdomínio do domínio base identifica a comunidade; raiz e hosts fora do
 * domínio base não têm tenant.
 */
describe("tenantSlugFromHost", () => {
  it("extrai o slug do subdomínio", () => {
    expect(tenantSlugFromHost("kalunga.quilombo.localhost")).toBe("kalunga");
  });

  it("ignora a porta", () => {
    expect(tenantSlugFromHost("kalunga.quilombo.localhost:8080")).toBe(
      "kalunga",
    );
  });

  it("não há tenant no domínio raiz", () => {
    expect(tenantSlugFromHost("quilombo.localhost")).toBeNull();
    expect(tenantSlugFromHost("quilombo.localhost:8080")).toBeNull();
  });

  it("não há tenant em hosts fora do domínio base", () => {
    expect(tenantSlugFromHost("localhost:3000")).toBeNull();
    expect(tenantSlugFromHost("example.com")).toBeNull();
  });

  it("sub-subdomínio não é tenant válido", () => {
    expect(tenantSlugFromHost("a.b.quilombo.localhost")).toBeNull();
  });

  it("é insensível a maiúsculas", () => {
    expect(tenantSlugFromHost("Kalunga.Quilombo.Localhost")).toBe("kalunga");
  });
});

describe("tenantHost / rootHost", () => {
  it("preserva a porta do host atual", () => {
    expect(tenantHost("palmares", "quilombo.localhost:8080")).toBe(
      "palmares.quilombo.localhost:8080",
    );
    expect(rootHost("kalunga.quilombo.localhost:8080")).toBe(
      "quilombo.localhost:8080",
    );
  });

  it("funciona sem porta", () => {
    expect(tenantHost("palmares", "quilombo.localhost")).toBe(
      "palmares.quilombo.localhost",
    );
    expect(rootHost("kalunga.quilombo.localhost")).toBe("quilombo.localhost");
  });
});
