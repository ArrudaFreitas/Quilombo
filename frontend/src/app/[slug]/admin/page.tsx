'use client'

import { AuthGuard } from '@/components/auth/auth-guard'
import { useAuth } from '@/components/auth/auth-provider'

/**
 * Placeholder da área protegida — existe para provar o guard de rota e o ciclo
 * de sessão (a área administrativa completa está fora do escopo desta etapa).
 */
export default function AdminPage() {
  return (
    <AuthGuard>
      <AdminHome />
    </AuthGuard>
  )
}

function AdminHome() {
  const { user, logout } = useAuth()

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="container-page py-12 md:py-16"
    >
      <div className="mx-auto max-w-2xl">
        <span className="badge badge-success">Sessão ativa</span>
        <h1 className="font-display text-fg mt-4 text-3xl font-semibold md:text-4xl">
          Painel administrativo
        </h1>
        <p className="text-fg-muted mt-3 text-lg text-balance">
          Olá{user?.name ? `, ${user.name}` : ''}. A administração da comunidade
          {user?.communitySlug ? ` ${user.communitySlug}` : ''} está em
          construção.
        </p>
        <div className="mt-8">
          <button
            type="button"
            onClick={() => void logout()}
            className="btn btn-ghost"
          >
            Sair
          </button>
        </div>
      </div>
    </main>
  )
}
