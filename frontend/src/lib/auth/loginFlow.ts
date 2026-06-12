import { BASE_DOMAIN, rootHost, tenantHost, tenantSlugFromHost } from "@/lib/tenant";

/**
 * Fluxo de login (OAuth2 Google):
 *
 * 1. No /admin do tenant, "Entrar com Google" grava o slug num cookie
 *    compartilhado (Domain=.<base>) e navega para o endpoint de autorização
 *    NO DOMÍNIO RAIZ — o redirect_uri registrado no Google é único, o da raiz.
 * 2. O backend autentica, emite um código opaco de uso único e redireciona
 *    para https://<base>/auth/callback?code=… (raiz, sem tenant).
 * 3. A página de callback na raiz lê o cookie e repassa o código para
 *    /auth/callback do subdomínio de origem.
 * 4. No subdomínio, o código é trocado por JWT + cookie de refresh
 *    (POST /api/v1/auth/token, same-origin) e o admin entra no painel.
 */

const LOGIN_SLUG_COOKIE = "quilombo_login_slug";

/** Passo 1 — lembra o tenant de origem e vai para o OAuth na raiz. */
export function beginLogin(currentHost: string): string {
  const slug = tenantSlugFromHost(currentHost);
  if (slug) {
    document.cookie =
      `${LOGIN_SLUG_COOKIE}=${encodeURIComponent(slug)}; ` +
      `domain=.${BASE_DOMAIN}; path=/; max-age=600; secure; samesite=lax`;
  }
  return `${window.location.protocol}//${rootHost(currentHost)}/oauth2/authorization/google`;
}

export function readLoginSlugCookie(): string | null {
  const match = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${LOGIN_SLUG_COOKIE}=`));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

export function clearLoginSlugCookie(): void {
  document.cookie =
    `${LOGIN_SLUG_COOKIE}=; domain=.${BASE_DOMAIN}; path=/; max-age=0; ` +
    `secure; samesite=lax`;
}

export type CallbackAction =
  | { kind: "exchange"; code: string }
  | { kind: "forward"; url: string }
  | { kind: "error"; reason: "missing-code" | "unknown-tenant" };

/**
 * Passos 2→3 — decide o que a página /auth/callback faz no host atual.
 * Puro para ser testável; quem chama lê cookie/location e executa.
 */
export function resolveCallback(
  currentHost: string,
  code: string | null,
  slugCookie: string | null,
  protocol: string,
): CallbackAction {
  if (!code) {
    return { kind: "error", reason: "missing-code" };
  }
  const slug = tenantSlugFromHost(currentHost);
  if (slug) {
    return { kind: "exchange", code };
  }
  if (slugCookie) {
    const url =
      `${protocol}//${tenantHost(slugCookie, currentHost)}` +
      `/auth/callback?code=${encodeURIComponent(code)}`;
    return { kind: "forward", url };
  }
  return { kind: "error", reason: "unknown-tenant" };
}
