'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import type { CommunityPage } from '@/lib/api/community-page'
import { Emblema, LeafIcon, SECTION_COMPONENTS } from './sections'

/**
 * Página institucional pública de uma comunidade. Tudo vive dentro do wrapper
 * `.institutional[data-style][data-palette]` — a barreira que isola o tema da
 * comunidade do produto. O modo claro/escuro vem do tema global (data-theme no
 * <html>, alternado pelo toggle do produto). Porte do `CommunityPage` do MVP.
 */
export function InstitutionalPage({ page }: { page: CommunityPage }) {
  const { community, page: config, sections } = page
  const style = config?.style || 'uniao'
  const palette = config?.palette || 'verde'

  // Revelar seções ao entrar na viewport (o CSS .rv respeita prefers-reduced-motion).
  useEffect(() => {
    const els = document.querySelectorAll('.institutional .rv')
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in')
            observer.unobserve(e.target)
          }
        }),
      { rootMargin: '0px 0px -10% 0px' },
    )
    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [sections])

  return (
    <div className="institutional" data-style={style} data-palette={palette}>
      <a className="ip-skip" href="#main-content">
        Pular para o conteúdo
      </a>

      <Header name={community.name} style={style} />

      <main id="main-content" tabIndex={-1}>
        {sections.length === 0 ? (
          <EmptyNotice name={community.name} />
        ) : (
          sections.map((section, i) => {
            const Component = SECTION_COMPONENTS[section.sectionType]
            if (!Component) return null
            return (
              <Component
                key={section.id}
                content={section.content}
                id={`sec-${i}`}
                style={style}
              />
            )
          })
        )}
      </main>

      {style === 'raizes' ? null : (
        <svg
          className="scallop"
          viewBox="0 0 1200 48"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M0 48 C 150 0 300 0 450 24 S 750 48 900 24 1050 0 1200 24 L1200 48 Z"
            fill="currentColor"
          />
        </svg>
      )}

      <Footer name={community.name} style={style} />
    </div>
  )
}

/** URL absoluta do diretório (ápice), preservando a porta de dev. */
function apexUrl(): string {
  if (typeof window === 'undefined') return '/'
  const base = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'quilombo.ianarruda.dev'
  const port = window.location.port ? `:${window.location.port}` : ''
  return `${window.location.protocol}//${base}${port}/`
}

function Header({ name, style }: { name: string; style: string }) {
  return (
    <header className="ip-header">
      <div className="ip-header-inner wrap">
        <a className="ip-brand" href="#main-content" aria-label={`${name} — início`}>
          {style === 'raizes' ? (
            <Emblema className="ip-brand-icon" />
          ) : (
            <LeafIcon className="ip-brand-icon" />
          )}
          <span>{name}</span>
        </a>
        <a className="ip-back" href={apexUrl()}>
          ← Todas as comunidades
        </a>
      </div>
      {style === 'raizes' ? <div className="ip-accent-bar" aria-hidden="true" /> : null}
    </header>
  )
}

function EmptyNotice({ name }: { name: string }) {
  return (
    <section className="blk" aria-labelledby="ip-empty-t">
      <div className="wrap ip-empty">
        <h2 id="ip-empty-t">A página de {name} está sendo preparada</h2>
        <p>
          Esta comunidade ainda está montando sua página. Volte em breve para
          conhecer sua história, território e cultura.
        </p>
      </div>
    </section>
  )
}

function Footer({ name, style }: { name: string; style: string }) {
  const year = new Date().getFullYear()
  return (
    <footer className={`ip-footer ${style === 'raizes' ? 'style-raizes' : ''}`}>
      <div className="wrap">
        <div className="ip-footer-cols">
          <div>
            <h4>A plataforma</h4>
            <div className="ip-footer-brand">
              <LeafIcon className="ip-footer-logo" />
              Quilombo
            </div>
            <p>
              Presença digital gratuita para comunidades quilombolas brasileiras.
              A comunidade é dona da própria história.
            </p>
          </div>
          <div>
            <h4>Navegar</h4>
            <ul>
              <li>
                <a href={apexUrl()}>Todas as comunidades</a>
              </li>
              <li>
                <a href="#main-content">Início</a>
              </li>
              <li>
                <Link href="/admin">Área administrativa</Link>
              </li>
            </ul>
          </div>
          <div>
            <h4>Contato</h4>
            <ul>
              <li>
                <a href="mailto:contato@quilombo.org">contato@quilombo.org</a>
              </li>
            </ul>
          </div>
        </div>
        <p className="ip-footer-copy">
          © {year} Plataforma Quilombo · Conteúdo da comunidade {name}.
        </p>
      </div>
    </footer>
  )
}
