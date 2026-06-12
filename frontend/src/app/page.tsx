/**
 * Placeholder da raiz. Próxima fase: na raiz (quilombo.localhost) esta página
 * vira o diretório público de comunidades (GET /api/v1/communities); nos
 * subdomínios, a página institucional (GET /api/v1/community).
 */
export default function Home() {
  return (
    <main
      id="conteudo"
      className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-4 px-4 py-16 md:px-8 lg:px-12"
    >
      <p className="text-sm font-bold uppercase tracking-widest text-primary">
        Quilombos do Brasil
      </p>
      <h1 className="text-center text-4xl text-foreground md:text-5xl">
        Quilombo
      </h1>
      <p className="max-w-prose text-center text-lg text-muted">
        Plataforma para comunidades quilombolas criarem e gerenciarem suas
        páginas institucionais. Em construção.
      </p>
    </main>
  );
}
