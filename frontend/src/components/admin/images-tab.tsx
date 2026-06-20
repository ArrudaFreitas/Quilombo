'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/components/auth/auth-provider'
import { ApiError } from '@/lib/api/client'
import {
  deleteImage,
  getStorage,
  listImages,
  updateAltText,
  uploadImage,
  type AdminImage,
  type StorageUsage,
} from '@/lib/api/admin/media'
import styles from './admin.module.css'

const MAX_FILE_BYTES = 5 * 1024 * 1024

type Status = 'loading' | 'ready' | 'error'

/**
 * Aba "Imagens": acervo da comunidade. Lista as imagens (com indicador de uso),
 * permite enviar novas (texto alternativo obrigatório, dentro da quota), editar
 * o texto alternativo e remover (bloqueado quando a imagem está em uso). Espelha
 * o acervo do MVP; a quota e o processamento (WebP) são autoridade do backend.
 */
export function ImagesTab() {
  const { getAccessToken } = useAuth()
  const [status, setStatus] = useState<Status>('loading')
  const [images, setImages] = useState<AdminImage[]>([])
  const [storage, setStorage] = useState<StorageUsage | null>(null)

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const token = getAccessToken()
        if (!token) throw new Error('sem sessão')
        const [imgs, usage] = await Promise.all([
          listImages(token),
          getStorage(token),
        ])
        if (!active) return
        setImages(imgs)
        setStorage(usage)
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

  function handleUploaded(image: AdminImage) {
    setImages((prev) => [image, ...prev])
    void refreshStorage()
  }

  function handleDeleted(filename: string) {
    setImages((prev) => prev.filter((img) => img.filename !== filename))
    void refreshStorage()
  }

  function handleAltUpdated(updated: AdminImage) {
    setImages((prev) =>
      prev.map((img) => (img.filename === updated.filename ? updated : img)),
    )
  }

  if (status === 'loading') {
    return (
      <p role="status" className="text-fg-muted py-16 text-center">
        Carregando o acervo…
      </p>
    )
  }
  if (status === 'error') {
    return (
      <p role="alert" className="text-fg-muted py-16 text-center">
        Não foi possível carregar o acervo. Recarregue a página.
      </p>
    )
  }

  return (
    <div className="grid gap-8 py-8">
      <header>
        <h1 className="font-display text-fg text-2xl font-semibold">
          Acervo de imagens
        </h1>
        <p className="text-fg-muted mt-1 text-balance">
          Envie e organize as fotos da comunidade. Elas ficam disponíveis para o
          card e para a página institucional.
        </p>
      </header>

      {storage ? <QuotaBar storage={storage} /> : null}

      <section className="surface grid gap-3 p-5">
        <h2 className="font-display text-fg text-lg font-semibold">
          Enviar imagem
        </h2>
        <Uploader storage={storage} onUploaded={handleUploaded} />
      </section>

      <section className="grid gap-4">
        <h2 className="text-fg-muted flex items-center gap-2 text-sm font-bold tracking-wide uppercase">
          Biblioteca
          <span className="badge">{images.length}</span>
        </h2>

        {images.length === 0 ? (
          <EmptyLibrary />
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {images.map((img) => (
              <ManageCard
                key={img.filename}
                image={img}
                onAltUpdated={handleAltUpdated}
                onDeleted={handleDeleted}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

/** Barra de quota — uso atual, limite e espaço disponível (cores por nível). */
function QuotaBar({ storage }: { storage: StorageUsage }) {
  const level =
    storage.percent >= 95 ? 'danger' : storage.percent >= 80 ? 'warn' : 'ok'
  const free = Math.max(storage.limitMb - storage.usedMb, 0)
  return (
    <div className="surface grid gap-2 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-fg-muted text-sm font-bold tracking-wide uppercase">
          Armazenamento
        </span>
        <span
          className={`text-sm font-bold ${
            level === 'danger'
              ? 'text-danger'
              : level === 'warn'
                ? 'text-accent'
                : 'text-fg-muted'
          }`}
        >
          {storage.usedMb.toFixed(1)} MB de {storage.limitMb} MB
        </span>
      </div>
      <progress
        className={styles.storageBar}
        data-level={level}
        max={100}
        value={Math.min(storage.percent, 100)}
        aria-label="Uso de armazenamento da comunidade"
      />
      <span className="text-fg-subtle text-xs">
        {free.toFixed(1)} MB disponíveis · {storage.percent.toFixed(0)}% usado
      </span>
    </div>
  )
}

function Uploader({
  storage,
  onUploaded,
}: {
  storage: StorageUsage | null
  onUploaded: (image: AdminImage) => void
}) {
  const { getAccessToken } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [altText, setAltText] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Object URL liberado ao desmontar/trocar (evita vazamento de memória).
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  function pick(f: File | undefined) {
    if (!f) return
    if (!f.type.startsWith('image/')) {
      setError('Apenas imagens são aceitas.')
      return
    }
    if (f.size > MAX_FILE_BYTES) {
      setError('A imagem deve ter no máximo 5 MB.')
      return
    }
    setError(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(f)
    setPreviewUrl(URL.createObjectURL(f))
  }

  function reset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(null)
    setPreviewUrl(null)
    setAltText('')
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function submit() {
    const token = getAccessToken()
    if (!file || !altText.trim() || !token) return
    if (storage && storage.percent >= 100) {
      setError('Armazenamento cheio. Remova imagens sem uso e tente de novo.')
      return
    }
    setUploading(true)
    setError(null)
    try {
      const image = await uploadImage(token, file, altText.trim())
      onUploaded(image)
      reset()
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Não foi possível enviar a imagem.',
      )
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="grid gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-label="Selecionar arquivo de imagem"
        onChange={(e) => pick(e.target.files?.[0])}
      />

      {!file || !previewUrl ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            pick(e.dataTransfer.files[0])
          }}
          className={`text-fg-muted hover:border-primary flex flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-10 text-sm ${
            dragging ? 'border-primary' : 'border-border-strong'
          }`}
        >
          <UploadIcon />
          <span>
            Arraste uma imagem ou{' '}
            <span className="text-primary font-bold">clique para selecionar</span>
          </span>
          <span className="text-fg-subtle text-xs">PNG, JPG, WebP — máx. 5 MB</span>
        </button>
      ) : (
        <div className="bg-bg-subtle relative aspect-[16/9] overflow-hidden rounded-lg">
          {/* preview local (object URL) — next/image não otimiza blob: */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Pré-visualização da imagem selecionada"
            className="h-full w-full object-cover"
          />
          <button
            type="button"
            onClick={reset}
            aria-label="Descartar imagem selecionada"
            className="bg-surface text-fg absolute top-2 right-2 grid size-7 place-items-center rounded-full text-lg leading-none shadow-sm"
          >
            ×
          </button>
        </div>
      )}

      {file ? (
        <div className="field">
          <label className="field-label" htmlFor="upload-alt-text">
            Texto alternativo <span className="text-danger">*</span>
          </label>
          <p className="text-fg-subtle text-xs">
            Descreva a imagem para quem usa leitor de tela. Ex.: &ldquo;Vista do
            território ao pôr do sol&rdquo;.
          </p>
          <textarea
            id="upload-alt-text"
            className="field-input resize-none"
            rows={2}
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            placeholder="Descreva o conteúdo visual…"
          />
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="field-error">
          {error}
        </p>
      ) : null}

      {file ? (
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-ghost btn-sm" onClick={reset}>
            Limpar
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={submit}
            disabled={uploading || !altText.trim()}
          >
            {uploading ? (
              <>
                <span className="btn-spinner" aria-hidden="true" />
                Enviando…
              </>
            ) : (
              'Enviar imagem'
            )}
          </button>
        </div>
      ) : null}
    </div>
  )
}

function ManageCard({
  image,
  onAltUpdated,
  onDeleted,
}: {
  image: AdminImage
  onAltUpdated: (image: AdminImage) => void
  onDeleted: (filename: string) => void
}) {
  const { getAccessToken } = useAuth()
  const [editing, setEditing] = useState(false)
  const [altDraft, setAltDraft] = useState(image.altText ?? '')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const altTextareaRef = useRef<HTMLTextAreaElement>(null)

  // Foco no textarea ao entrar em edição (alternativa acessível ao autoFocus).
  useEffect(() => {
    if (editing) altTextareaRef.current?.focus()
  }, [editing])

  async function saveAlt() {
    const token = getAccessToken()
    if (!token || !altDraft.trim()) return
    setSaving(true)
    setError(null)
    try {
      const updated = await updateAltText(token, image.filename, altDraft.trim())
      onAltUpdated(updated)
      setEditing(false)
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Não foi possível salvar o texto.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    const token = getAccessToken()
    if (!token) return
    setDeleting(true)
    setError(null)
    try {
      await deleteImage(token, image.filename)
      onDeleted(image.filename)
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Não foi possível remover a imagem.',
      )
      setConfirmDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <li className="surface flex flex-col overflow-hidden">
      <div className="bg-bg-subtle relative aspect-[4/3] overflow-hidden">
        <Image
          src={image.url}
          alt={image.altText ?? ''}
          fill
          unoptimized
          className="object-cover"
        />
        {image.inUse ? (
          <span className="bg-surface text-fg-muted absolute top-2 left-2 rounded-full px-2 py-0.5 text-xs font-bold shadow-sm">
            Em uso
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="text-fg-subtle truncate text-xs" title={image.filename}>
          {image.filename}
        </p>
        <p className="text-fg-subtle text-xs">{image.sizeKb.toFixed(1)} KB · WebP</p>

        {editing ? (
          <div className="grid gap-2">
            <textarea
              ref={altTextareaRef}
              className="field-input resize-none text-sm"
              rows={2}
              value={altDraft}
              onChange={(e) => setAltDraft(e.target.value)}
              aria-label="Texto alternativo da imagem"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setEditing(false)
                  setAltDraft(image.altText ?? '')
                  setError(null)
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={saveAlt}
                disabled={saving || !altDraft.trim()}
              >
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="text-fg-muted hover:text-fg text-left text-sm"
            onClick={() => setEditing(true)}
            title="Editar o texto alternativo"
          >
            {image.altText ? (
              <span className="line-clamp-2">{image.altText}</span>
            ) : (
              <span className="text-fg-subtle italic">
                Sem texto alternativo — clique para adicionar
              </span>
            )}
          </button>
        )}

        {error ? (
          <p role="alert" className="field-error">
            {error}
          </p>
        ) : null}

        <div className="mt-auto flex justify-end pt-1">
          {confirmDelete ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-fg-muted">Remover?</span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
              >
                Não
              </button>
              <button
                type="button"
                className="text-danger text-sm font-bold"
                onClick={remove}
                disabled={deleting}
              >
                {deleting ? 'Removendo…' : 'Sim, remover'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="text-fg-subtle hover:text-danger inline-flex items-center gap-1.5 text-sm"
              onClick={() =>
                image.inUse
                  ? setError('Imagem em uso — remova das seções/card antes de excluir.')
                  : setConfirmDelete(true)
              }
              title={image.inUse ? 'Imagem em uso' : 'Excluir imagem'}
            >
              <TrashIcon />
              Excluir
            </button>
          )}
        </div>
      </div>
    </li>
  )
}

function EmptyLibrary() {
  return (
    <div className="border-border text-fg-muted grid place-items-center gap-3 rounded-xl border border-dashed py-16 text-center">
      <ImageIcon />
      <p className="text-balance">
        Nenhuma imagem no acervo ainda. Use &ldquo;Enviar imagem&rdquo; acima.
      </p>
    </div>
  )
}

function UploadIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  )
}

function ImageIcon() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  )
}
