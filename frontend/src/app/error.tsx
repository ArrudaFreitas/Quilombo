"use client";

/** Erro inesperado (ex.: API fora do ar). Oferece nova tentativa. */
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main
      id="conteudo"
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-start justify-center gap-4 px-4 py-16 md:px-8"
    >
      <p className="text-sm font-bold uppercase tracking-widest text-primary">
        Algo deu errado
      </p>
      <h1 className="text-4xl text-foreground">Não foi possível carregar a página</h1>
      <p className="max-w-prose text-lg text-muted">
        Pode ser uma instabilidade momentânea. Tente novamente em instantes.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-2 rounded-theme-sm bg-primary px-5 py-3 font-bold text-on-primary hover:bg-primary-strong"
      >
        Tentar novamente
      </button>
    </main>
  );
}
