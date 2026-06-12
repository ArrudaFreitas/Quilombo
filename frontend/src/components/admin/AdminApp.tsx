"use client";

import { useSyncExternalStore } from "react";
import { tenantSlugFromHost } from "@/lib/tenant";
import { useAdminSession } from "@/lib/auth/useAdminSession";
import type { AdminMe } from "@/lib/api/types";
import type { AdminFetcher } from "@/lib/api/admin";
import { LoginScreen } from "./LoginScreen";
import { Tabs } from "./Tabs";
import { CardTab } from "./CardTab";
import { PageTab } from "./PageTab";
import { ImagesTab } from "./ImagesTab";

const noopSubscribe = () => () => {};

/** Painel administrativo do tenant atual (client-only: sessão no navegador). */
export function AdminApp() {
  // O slug só existe no navegador (hostname). useSyncExternalStore com
  // snapshot de servidor `undefined` evita mismatch de hidratação.
  const slug = useSyncExternalStore<string | null | undefined>(
    noopSubscribe,
    () => tenantSlugFromHost(window.location.host),
    () => undefined,
  );

  if (slug === undefined) {
    return <Busy />;
  }
  if (slug === null) {
    return (
      <main id="conteudo" className="mx-auto w-full max-w-2xl flex-1 px-4 py-16">
        <h1 className="text-3xl text-foreground">Área administrativa</h1>
        <p className="mt-4 max-w-prose text-lg text-muted">
          A administração é feita no endereço da sua comunidade — acesse{" "}
          <span className="font-bold">
            https://&lt;comunidade&gt;.{window.location.host}/admin
          </span>
          .
        </p>
      </main>
    );
  }
  return <AdminForTenant slug={slug} />;
}

function AdminForTenant({ slug }: { slug: string }) {
  const { session, adminFetch, login, signOut } = useAdminSession(slug);

  if (session.status === "loading") {
    return <Busy />;
  }
  if (session.status === "anon") {
    return <LoginScreen onLogin={login} />;
  }
  return (
    <AdminShell
      slug={slug}
      user={session.user}
      adminFetch={adminFetch}
      onSignOut={signOut}
    />
  );
}

function AdminShell({
  slug,
  user,
  adminFetch,
  onSignOut,
}: {
  slug: string;
  user: AdminMe;
  adminFetch: AdminFetcher;
  onSignOut: () => Promise<void>;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 md:px-8">
          <div className="flex flex-col">
            <p className="font-display text-lg font-bold text-foreground">
              Administração
            </p>
            <p className="text-sm text-subtle">
              {slug}.{window.location.host.replace(`${slug}.`, "")}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted">{user.name}</p>
            <button
              type="button"
              onClick={() => void onSignOut()}
              className="rounded-theme-sm border border-border-strong px-4 py-2 text-sm font-bold text-foreground hover:bg-background-subtle"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main id="conteudo" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8">
        <Tabs
          label="Seções do painel"
          tabs={[
            {
              id: "comunidade",
              label: "Comunidade",
              content: <CardTab adminFetch={adminFetch} />,
            },
            {
              id: "pagina",
              label: "Página",
              content: <PageTab adminFetch={adminFetch} />,
            },
            {
              id: "imagens",
              label: "Imagens",
              content: <ImagesTab adminFetch={adminFetch} />,
            },
          ]}
        />
      </main>
    </div>
  );
}

function Busy() {
  return (
    <main
      id="conteudo"
      aria-busy="true"
      className="mx-auto flex w-full max-w-2xl flex-1 items-center justify-center px-4 py-16"
    >
      <p role="status" className="text-lg text-muted">
        Carregando…
      </p>
    </main>
  );
}
