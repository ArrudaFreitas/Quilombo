"use client";

import { ApiError } from "@/lib/api/client";

/** Peças e convenções visuais compartilhadas do painel. */

export const btnPrimary =
  "rounded-theme-sm bg-primary px-5 py-3 font-bold text-on-primary " +
  "hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-50";

export const btnSecondary =
  "rounded-theme-sm border border-border-strong px-4 py-2 text-sm font-bold " +
  "text-foreground hover:bg-background-subtle disabled:cursor-not-allowed disabled:opacity-50";

export const btnDanger =
  "rounded-theme-sm border border-accent px-4 py-2 text-sm font-bold " +
  "text-accent hover:bg-background-subtle disabled:cursor-not-allowed disabled:opacity-50";

export const inputClass =
  "w-full rounded-theme-sm border border-border bg-surface-raised px-3 py-2 " +
  "text-foreground placeholder:text-subtle";

/** Mensagem do ProblemDetail do backend, ou um texto genérico. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.problem.detail ?? error.problem.title ?? "Erro na operação.";
  }
  return "Não foi possível completar a operação. Tente novamente.";
}

/**
 * Feedback de operação. Sucesso usa role="status" (anúncio educado);
 * erro usa role="alert" (anúncio imediato) — WCAG 4.1.3.
 */
export function Feedback({
  kind,
  children,
}: {
  kind: "success" | "error";
  children: React.ReactNode;
}) {
  if (!children) return null;
  return (
    <p
      role={kind === "error" ? "alert" : "status"}
      className={`rounded-theme-sm px-4 py-3 text-sm font-bold ${
        kind === "error"
          ? "bg-accent text-on-accent"
          : "bg-secondary text-foreground"
      }`}
    >
      {children}
    </p>
  );
}

/** Estado de carregamento de um painel/aba. */
export function PanelLoading() {
  return (
    <p role="status" aria-busy="true" className="py-8 text-muted">
      Carregando…
    </p>
  );
}
