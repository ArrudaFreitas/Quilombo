"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { exchangeToken } from "@/lib/api/auth";
import { saveAccessToken } from "@/lib/auth/tokenStore";
import {
  clearLoginSlugCookie,
  readLoginSlugCookie,
  resolveCallback,
} from "@/lib/auth/loginFlow";
import { tenantSlugFromHost } from "@/lib/tenant";

/**
 * Destino do redirect pós-OAuth (?code=…).
 *
 * Na raiz: encaminha o código ao subdomínio que iniciou o login (cookie
 * compartilhado). No subdomínio: troca o código por JWT + cookie de refresh
 * (same-origin) e segue para /admin.
 */
export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<Status message="Entrando…" busy />}>
      <CallbackHandler />
    </Suspense>
  );
}

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // código é de uso único — nunca trocar 2x
    started.current = true;

    async function handle() {
      const action = resolveCallback(
        window.location.host,
        searchParams.get("code"),
        readLoginSlugCookie(),
        window.location.protocol,
      );

      switch (action.kind) {
        case "forward":
          window.location.replace(action.url);
          return;
        case "exchange": {
          const slug = tenantSlugFromHost(window.location.host)!;
          clearLoginSlugCookie();
          try {
            const { data } = await exchangeToken(action.code);
            saveAccessToken(slug, data.token);
            router.replace("/admin");
          } catch {
            setError(
              "Não foi possível concluir o login. O acesso é restrito a " +
                "administradores cadastrados desta comunidade — verifique se " +
                "entrou com a conta certa e tente de novo.",
            );
          }
          return;
        }
        case "error":
          setError(
            action.reason === "missing-code"
              ? "Link de login inválido ou expirado. Inicie o login novamente."
              : "Não foi possível identificar a comunidade deste login. " +
                "Acesse a área administrativa da sua comunidade e tente de novo.",
          );
      }
    }

    void handle();
  }, [router, searchParams]);

  if (error) {
    return (
      <main
        id="conteudo"
        className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-start justify-center gap-4 px-4 py-16 md:px-8"
      >
        <h1 className="text-3xl text-foreground">Falha no login</h1>
        <p role="alert" className="max-w-prose text-lg text-muted">
          {error}
        </p>
        <a
          href="/admin"
          className="mt-2 rounded-theme-sm bg-primary px-5 py-3 font-bold text-on-primary hover:bg-primary-strong"
        >
          Voltar para a área administrativa
        </a>
      </main>
    );
  }
  return <Status message="Entrando…" busy />;
}

function Status({ message, busy }: { message: string; busy?: boolean }) {
  return (
    <main
      id="conteudo"
      aria-busy={busy}
      className="mx-auto flex w-full max-w-2xl flex-1 items-center justify-center px-4 py-16"
    >
      <p role="status" className="text-lg text-muted">
        {message}
      </p>
    </main>
  );
}
