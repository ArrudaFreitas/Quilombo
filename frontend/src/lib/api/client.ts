import type { ApiEnvelope, ProblemDetail } from "./types";

/**
 * Cliente HTTP da API.
 *
 * No browser as chamadas são same-origin (o nginx serve frontend e backend sob
 * o mesmo host — cookies de refresh e tenant por subdomínio funcionam sem CORS).
 * No servidor (Server Components/route handlers) a chamada vai direto ao
 * backend via API_INTERNAL_URL, repassando o Host da requisição original para
 * o backend resolver o tenant.
 */

const API_PREFIX = "/api/v1";

export class ApiError extends Error {
  readonly status: number;
  readonly problem: ProblemDetail;

  constructor(problem: ProblemDetail) {
    super(problem.detail ?? problem.title ?? `HTTP ${problem.status}`);
    this.name = "ApiError";
    this.status = problem.status;
    this.problem = problem;
  }
}

export interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  /** Serializado como JSON quando presente. */
  body?: unknown;
  /**
   * Host do tenant (ex.: "kalunga.quilombo.localhost:8080") — obrigatório em
   * chamadas server-side a endpoints que dependem de tenant; ignorado no
   * browser, onde o Host já é o da página.
   */
  tenantHost?: string;
  /** Access token (Bearer) para endpoints /admin. */
  accessToken?: string;
}

function baseUrl(): string {
  if (typeof window !== "undefined") {
    return ""; // same-origin via nginx
  }
  return process.env.API_INTERNAL_URL ?? "http://backend:8080";
}

/**
 * Chama a API e desembrulha o envelope `{ data, meta }`.
 *
 * @throws {ApiError} para respostas de erro (ProblemDetail / RFC 7807).
 */
export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<ApiEnvelope<T>> {
  const { body, tenantHost, accessToken, headers, ...init } = options;

  const requestHeaders = new Headers(headers);
  requestHeaders.set("Accept", "application/json");
  if (body !== undefined) {
    requestHeaders.set("Content-Type", "application/json");
  }
  if (accessToken) {
    requestHeaders.set("Authorization", `Bearer ${accessToken}`);
  }
  if (tenantHost && typeof window === "undefined") {
    requestHeaders.set("Host", tenantHost);
  }

  const response = await fetch(`${baseUrl()}${API_PREFIX}${path}`, {
    ...init,
    headers: requestHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new ApiError(await readProblem(response));
  }
  return (await response.json()) as ApiEnvelope<T>;
}

async function readProblem(response: Response): Promise<ProblemDetail> {
  try {
    const problem = (await response.json()) as ProblemDetail;
    return { ...problem, status: problem.status ?? response.status };
  } catch {
    return { status: response.status, title: response.statusText };
  }
}
