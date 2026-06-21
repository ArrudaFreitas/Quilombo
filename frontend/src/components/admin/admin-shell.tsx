'use client'

import { useState } from 'react'
import { useAuth } from '@/components/auth/auth-provider'
import { CommunityTab } from './community-tab'
import { ImagesTab } from './images-tab'
import { PageTab } from './page/page-tab'

type TabId = 'card' | 'page' | 'images'

const TABS: { id: TabId; label: string }[] = [
  { id: 'card', label: 'Comunidade' },
  { id: 'page', label: 'Página' },
  { id: 'images', label: 'Imagens' },
]

/**
 * Casca do painel administrativo do tenant: barra superior (identidade da
 * comunidade + sair) e abas. Renderizada dentro do `AuthGuard`, então a sessão
 * já está garantida. Três abas: Comunidade (card), Página (construtor
 * institucional) e Imagens (acervo).
 */
export function AdminShell() {
  const { user, logout } = useAuth()
  const [active, setActive] = useState<TabId>('card')

  return (
    <div className="min-h-dvh">
      <header className="border-border bg-bg-subtle border-b">
        <div className="container-page flex items-center justify-between gap-4 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="bg-primary inline-block size-2.5 shrink-0 rounded-full"
              aria-hidden="true"
            />
            <span className="font-display text-fg font-bold">Quilombo</span>
            {user?.communitySlug ? (
              <>
                <span className="text-fg-subtle" aria-hidden="true">
                  ·
                </span>
                <span className="text-fg-muted truncate text-sm font-bold tracking-wide uppercase">
                  {user.communitySlug}
                </span>
              </>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {user?.name ? (
              <span className="text-fg-muted hidden text-sm sm:inline">
                {user.name}
              </span>
            ) : null}
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => void logout()}
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="container-page">
        <div className="tabs" role="tablist" aria-label="Seções do painel">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={active === tab.id}
              aria-controls={`panel-${tab.id}`}
              className="tab"
              onClick={() => setActive(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div
          id={`panel-${active}`}
          role="tabpanel"
          aria-labelledby={`tab-${active}`}
          tabIndex={0}
        >
          {active === 'card' ? (
            <CommunityTab />
          ) : active === 'images' ? (
            <ImagesTab />
          ) : (
            <PageTab />
          )}
        </div>
      </div>
    </div>
  )
}
