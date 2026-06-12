import Link from "next/link";

/** 404 — inclusive para subdomínios que não correspondem a uma comunidade. */
export default function NotFound() {
  return (
    <main
      id="conteudo"
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-start justify-center gap-4 px-4 py-16 md:px-8"
    >
      <p className="text-sm font-bold uppercase tracking-widest text-primary">
        Erro 404
      </p>
      <h1 className="text-4xl text-foreground">Página não encontrada</h1>
      <p className="max-w-prose text-lg text-muted">
        O endereço pode estar errado ou esta comunidade ainda não existe na
        plataforma.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-theme-sm bg-primary px-5 py-3 font-bold text-on-primary hover:bg-primary-strong"
      >
        Ir para a página inicial
      </Link>
    </main>
  );
}
