import "server-only";

import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { ApiError } from "./client";
import type { ApiEnvelope, ProblemDetail } from "./types";

/**
 * Fetch da API para Server Components.
 *
 * Não usa o fetch global: o undici descarta o header Host (spec do browser), e
 * o backend resolve o tenant exatamente por ele. node:http permite repassar o
 * Host da requisição original (ex.: "kalunga.quilombo.localhost:8080") para o
 * backend interno (API_INTERNAL_URL, default http://backend:8080).
 */

const API_PREFIX = "/api/v1";

export interface ServerApiOptions {
  /** Host original da requisição — obrigatório em endpoints por tenant. */
  tenantHost?: string;
}

export function serverApiFetch<T>(
  path: string,
  options: ServerApiOptions = {},
): Promise<ApiEnvelope<T>> {
  const base = new URL(process.env.API_INTERNAL_URL ?? "http://backend:8080");
  const doRequest = base.protocol === "https:" ? httpsRequest : httpRequest;

  return new Promise((resolve, reject) => {
    const req = doRequest(
      {
        host: base.hostname,
        port: base.port || (base.protocol === "https:" ? 443 : 80),
        path: `${API_PREFIX}${path}`,
        method: "GET",
        headers: {
          Accept: "application/json",
          ...(options.tenantHost ? { Host: options.tenantHost } : {}),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf-8");
          const status = res.statusCode ?? 0;
          if (status >= 200 && status < 300) {
            try {
              resolve(JSON.parse(body) as ApiEnvelope<T>);
            } catch (error) {
              reject(error);
            }
          } else {
            reject(new ApiError(parseProblem(body, status)));
          }
        });
      },
    );
    req.on("error", reject);
    req.end();
  });
}

function parseProblem(body: string, status: number): ProblemDetail {
  try {
    const problem = JSON.parse(body) as ProblemDetail;
    return { ...problem, status: problem.status ?? status };
  } catch {
    return { status };
  }
}
