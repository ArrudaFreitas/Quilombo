import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="container-page flex flex-col items-center py-24 text-center">
      <p className="font-display text-primary text-7xl font-semibold md:text-8xl">
        404
      </p>
      <h1 className="font-display text-fg mt-2 text-3xl">
        Página não encontrada
      </h1>
      <p className="text-fg-muted mt-3 max-w-md">
        A página que você procura não existe ou foi movida.
      </p>
      <Link href="/" className="btn btn-primary mt-8">
        Voltar ao diretório
      </Link>
    </main>
  )
}
