"use client";

/** Entrada do painel: login com Google (allowlist validada no backend). */
export function LoginScreen({ onLogin }: { onLogin: () => void }) {
  return (
    <main
      id="conteudo"
      className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-start justify-center gap-4 px-4 py-16 md:px-8"
    >
      <p className="text-sm font-bold uppercase tracking-widest text-primary">
        Área administrativa
      </p>
      <h1 className="text-4xl text-foreground">Entrar no painel</h1>
      <p className="max-w-prose text-lg text-muted">
        O acesso é restrito a administradores cadastrados desta comunidade.
        Entre com a sua conta Google.
      </p>
      <button
        type="button"
        onClick={onLogin}
        className="mt-2 rounded-theme-sm bg-primary px-6 py-3 font-bold text-on-primary hover:bg-primary-strong"
      >
        Entrar com Google
      </button>
    </main>
  );
}
