import type { Metadata } from 'next'
import { LoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = {
  title: 'Entrar',
  description: 'Acesso administrativo da comunidade.',
}

interface LoginPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ returnTo?: string | string[] }>
}

export default async function LoginPage({
  params,
  searchParams,
}: LoginPageProps) {
  const { slug } = await params
  const { returnTo: rawReturnTo } = await searchParams
  const returnTo = Array.isArray(rawReturnTo) ? rawReturnTo[0] : rawReturnTo

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="container-page flex min-h-dvh items-center justify-center py-12"
    >
      <div className="w-full max-w-md">
        <div className="surface animate-fade-up p-8 sm:p-10">
          <header className="mb-8 text-center">
            <p className="text-fg-muted mb-4 inline-flex items-center gap-2 text-sm font-bold tracking-[0.14em] uppercase">
              <span
                className="bg-accent inline-block size-2 rounded-full"
                aria-hidden="true"
              />
              Quilombo
            </p>
            <h1 className="font-display text-fg text-3xl leading-tight font-semibold md:text-4xl">
              Área administrativa
            </h1>
            <p className="text-fg-muted mt-3 text-balance">
              Entre para gerenciar a comunidade{' '}
              <span className="text-fg font-semibold">{slug}</span>.
            </p>
          </header>

          <LoginForm returnTo={returnTo} />
        </div>
      </div>
    </main>
  )
}
