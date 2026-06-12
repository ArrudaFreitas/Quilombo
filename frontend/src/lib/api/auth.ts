import { apiFetch } from "./client";
import type { AdminMe, TokenResponse } from "./types";

/**
 * Endpoints de autenticação. O access token (JWT, 1h) trafega no corpo e fica
 * com o frontend; o refresh token vive só no cookie httpOnly `quilombo_refresh`
 * (host-only, path /api/v1/auth) — o navegador o envia sozinho por sermos
 * same-origin atrás do nginx.
 */

/** Troca o código de uso único do callback OAuth pelo par de tokens. */
export function exchangeToken(code: string) {
  return apiFetch<TokenResponse>("/auth/token", { method: "POST", body: { code } });
}

/** Rotaciona a sessão longa (cookie) e devolve um access token novo. */
export function refreshToken() {
  return apiFetch<TokenResponse>("/auth/refresh", { method: "POST" });
}

/** Revoga a sessão longa e expira o cookie — idempotente. */
export function logout() {
  return apiFetch<void>("/auth/logout", { method: "POST" });
}

/** Sessão atual (valida assinatura + allowlist no banco). */
export function me(accessToken: string) {
  return apiFetch<AdminMe>("/auth/me", { accessToken });
}
