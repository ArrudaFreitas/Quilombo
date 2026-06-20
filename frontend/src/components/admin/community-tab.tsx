'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/auth/auth-provider'
import { CommunityImage } from '@/components/community-image'
import { getCard, updateCard, type AdminCard } from '@/lib/api/admin/card'
import { getStorage, type StorageUsage } from '@/lib/api/admin/media'
import { ImageField } from './image-field'

const DESC_MAX = 200

type Status = 'loading' | 'ready' | 'error'
type SaveState = 'idle' | 'ok' | 'error'

/**
 * Aba "Comunidade": edita o card do diretório (imagem de capa + descrição
 * curta). Nome e localização são oficiais e somente leitura. A coluna direita é
 * um preview fiel ao card do diretório, atualizado ao vivo conforme o rascunho.
 */
export function CommunityTab() {
  const { getAccessToken, user } = useAuth()
  const [status, setStatus] = useState<Status>('loading')
  const [card, setCard] = useState<AdminCard | null>(null)
  const [storage, setStorage] = useState<StorageUsage | null>(null)
  const [draftImage, setDraftImage] = useState<string | null>(null)
  const [draftImageAlt, setDraftImageAlt] = useState<string | null>(null)
  const [draftDesc, setDraftDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const token = getAccessToken()
        if (!token) throw new Error('sem sessão')
        const [cardData, storageData] = await Promise.all([
          getCard(token),
          getStorage(token),
        ])
        if (!active) return
        setCard(cardData)
        setStorage(storageData)
        setDraftImage(cardData.imageUrl)
        setDraftImageAlt(cardData.imageAltText)
        setDraftDesc(cardData.shortDescription ?? '')
        setStatus('ready')
      } catch {
        if (active) setStatus('error')
      }
    })()
    return () => {
      active = false
    }
  }, [getAccessToken])

  async function refreshStorage() {
    const token = getAccessToken()
    if (!token) return
    try {
      setStorage(await getStorage(token))
    } catch {
      /* mantém a quota anterior em caso de falha */
    }
  }

  async function handleSave() {
    const token = getAccessToken()
    if (!token || !card) return
    setSaving(true)
    setSaveState('idle')
    try {
      const updated = await updateCard(token, {
        imageUrl: draftImage,
        imageAltText: draftImageAlt,
        shortDescription: draftDesc.trim() || null,
      })
      setCard(updated)
      setDraftImage(updated.imageUrl)
      setDraftImageAlt(updated.imageAltText)
      setDraftDesc(updated.shortDescription ?? '')
      setSaveState('ok')
    } catch {
      setSaveState('error')
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading') {
    return (
      <p role="status" className="text-fg-muted py-16 text-center">
        Carregando…
      </p>
    )
  }
  if (status === 'error' || !card) {
    return (
      <p role="alert" className="text-fg-muted py-16 text-center">
        Não foi possível carregar o card. Recarregue a página.
      </p>
    )
  }

  const dirty =
    draftImage !== card.imageUrl ||
    draftDesc.trim() !== (card.shortDescription ?? '')
  const descLeft = DESC_MAX - draftDesc.length

  return (
    <div className="grid gap-8 py-8 lg:grid-cols-[1fr_22rem]">
      <div className="grid gap-6">
        <header>
          <h1 className="font-display text-fg text-2xl font-semibold">
            Card da comunidade
          </h1>
          <p className="text-fg-muted mt-1 text-balance">
            Como sua comunidade aparece no diretório do Quilombo.
          </p>
        </header>

        <section className="surface grid gap-4 p-5">
          <h2 className="text-fg-muted flex items-center gap-2 text-sm font-bold tracking-wide uppercase">
            <LockIcon />
            Informações fixas
          </h2>
          <p className="text-fg-subtle text-sm">
            Nome e localização são oficiais e geridos pela equipe do Quilombo.
          </p>
          <div className="field">
            <label className="field-label" htmlFor="card-name">
              Nome
            </label>
            <input
              id="card-name"
              className="field-input"
              value={card.name}
              readOnly
              aria-readonly="true"
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="card-location">
              Localização
            </label>
            <input
              id="card-location"
              className="field-input"
              value={card.location}
              readOnly
              aria-readonly="true"
            />
          </div>
        </section>

        <section className="surface grid gap-3 p-5">
          <h2 className="font-display text-fg text-lg font-semibold">
            Imagem de capa
          </h2>
          <p className="text-fg-subtle text-sm">
            Uma foto do território ou das tradições. Formato paisagem (16:9).
          </p>
          <ImageField
            value={draftImage}
            alt={draftImageAlt}
            onChange={(url, altText) => {
              setDraftImage(url)
              setDraftImageAlt(altText)
            }}
            storage={storage}
            onUploaded={refreshStorage}
          />
        </section>

        <section className="surface grid gap-2 p-5">
          <h2 className="font-display text-fg text-lg font-semibold">
            Descrição curta
          </h2>
          <p className="text-fg-subtle text-sm">
            Uma ou duas frases que apresentam a comunidade a um visitante.
          </p>
          <textarea
            className="field-input resize-none"
            rows={4}
            maxLength={DESC_MAX}
            value={draftDesc}
            onChange={(e) => setDraftDesc(e.target.value)}
            placeholder="Ex.: Formada por descendentes de africanos escravizados, a comunidade preserva tradições centenárias às margens do rio."
          />
          <span
            className={`text-xs ${descLeft <= 20 ? 'text-danger' : 'text-fg-subtle'}`}
          >
            {descLeft} caracteres restantes
          </span>
        </section>

        <div className="flex flex-wrap items-center justify-end gap-3">
          {saveState === 'ok' ? (
            <span role="status" className="text-success text-sm font-bold">
              ✓ Salvo
            </span>
          ) : null}
          {saveState === 'error' ? (
            <span role="alert" className="text-danger text-sm">
              Erro ao salvar. Tente de novo.
            </span>
          ) : null}
          {!dirty && saveState !== 'ok' ? (
            <span className="text-fg-subtle text-sm">
              Sem alterações pendentes.
            </span>
          ) : null}
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || !dirty}
          >
            {saving ? (
              <>
                <span className="btn-spinner" aria-hidden="true" />
                Salvando…
              </>
            ) : (
              'Salvar alterações'
            )}
          </button>
        </div>
      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <p className="text-fg-subtle mb-3 text-xs font-bold tracking-wide uppercase">
          Pré-visualização
        </p>
        <CardPreview
          name={card.name}
          location={card.location}
          slug={user?.communitySlug ?? ''}
          imageUrl={draftImage}
          imageAlt={draftImageAlt}
          description={draftDesc}
        />
        <p className="text-fg-subtle mt-3 text-xs text-balance">
          As alterações ficam visíveis para todos os visitantes assim que você
          salva.
        </p>
      </aside>
    </div>
  )
}

/** Espelho não-interativo do card do diretório (mesma estética). */
function CardPreview({
  name,
  location,
  slug,
  imageUrl,
  imageAlt,
  description,
}: {
  name: string
  location: string
  slug: string
  imageUrl: string | null
  imageAlt: string | null
  description: string
}) {
  return (
    <div className="surface overflow-hidden">
      <div className="bg-bg-subtle relative aspect-[16/9] overflow-hidden">
        <CommunityImage src={imageUrl} name={name} slug={slug} alt={imageAlt ?? ''} />
      </div>
      <div className="p-5">
        <p className="text-primary mb-2 inline-flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase">
          <PinIcon />
          <span>{location}</span>
        </p>
        <h3 className="font-display text-fg text-xl leading-tight font-semibold">
          {name}
        </h3>
        {description.trim() ? (
          <p className="text-fg-muted mt-2 line-clamp-3 text-sm">{description}</p>
        ) : (
          <p className="text-fg-subtle mt-2 text-sm italic">
            Nenhuma descrição ainda.
          </p>
        )}
      </div>
    </div>
  )
}

function LockIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 1 1 8 0v4" />
    </svg>
  )
}

function PinIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      aria-hidden="true"
    >
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  )
}
