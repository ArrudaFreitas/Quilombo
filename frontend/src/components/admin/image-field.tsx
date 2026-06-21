'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/components/auth/auth-provider'
import { ApiError } from '@/lib/api/client'
import {
  listImages,
  uploadImage,
  type AdminImage,
  type StorageUsage,
} from '@/lib/api/admin/media'
import styles from './admin.module.css'

const MAX_FILE_BYTES = 5 * 1024 * 1024

type Mode = 'idle' | 'upload' | 'library'

interface ImageFieldProps {
  /** URL da imagem no rascunho atual (ou `null`). */
  value: string | null
  /** Texto alternativo da imagem atual (ou `null`) — viaja junto da URL. */
  alt: string | null
  /** Recebe URL e texto alternativo da imagem escolhida (ambos `null` ao remover). */
  onChange: (url: string | null, altText: string | null) => void
  /** Quota da comunidade — avisa/bloqueia no upload; `null` enquanto carrega. */
  storage: StorageUsage | null
  /** Chamado após upload bem-sucedido — o pai recarrega a quota. */
  onUploaded: () => void
}

/**
 * Campo de imagem do painel: mostra a imagem atual e permite trocá-la por um
 * upload novo (texto alternativo obrigatório) ou por uma imagem já no acervo.
 * As imagens vêm same-origin do MinIO via nginx (/quilombo-uploads/); o
 * next/image roda com `unoptimized` (o backend já entrega WebP dimensionado).
 */
export function ImageField({
  value,
  alt,
  onChange,
  storage,
  onUploaded,
}: ImageFieldProps) {
  const [mode, setMode] = useState<Mode>('idle')

  return (
    <div className="grid gap-3">
      {value && mode === 'idle' ? (
        <div className="bg-bg-subtle relative aspect-[16/9] overflow-hidden rounded-xl">
          <Image
            src={value}
            alt={alt ?? ''}
            fill
            unoptimized
            className="object-cover"
          />
        </div>
      ) : null}

      {mode === 'idle' ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setMode('upload')}
          >
            {value ? 'Trocar imagem' : 'Enviar imagem'}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setMode('library')}
          >
            Escolher do acervo
          </button>
          {value ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => onChange(null, null)}
            >
              Remover
            </button>
          ) : null}
        </div>
      ) : null}

      {mode === 'upload' ? (
        <UploadPanel
          storage={storage}
          onCancel={() => setMode('idle')}
          onUploaded={(img) => {
            onChange(img.url, img.altText)
            onUploaded()
            setMode('idle')
          }}
        />
      ) : null}

      {mode === 'library' ? (
        <LibraryPanel
          currentUrl={value}
          onCancel={() => setMode('idle')}
          onPick={(img) => {
            onChange(img.url, img.altText)
            setMode('idle')
          }}
        />
      ) : null}
    </div>
  )
}

function UploadPanel({
  storage,
  onUploaded,
  onCancel,
}: {
  storage: StorageUsage | null
  onUploaded: (image: AdminImage) => void
  onCancel: () => void
}) {
  const { getAccessToken } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [altText, setAltText] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Object URL liberado ao desmontar (evita vazamento de memória).
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
  }

  async function submit() {
    const token = getAccessToken()
    if (!file || !altText.trim() || !token) return
    if (storage && storage.percent >= 100) {
      setError('Armazenamento cheio. Remova imagens sem uso no acervo e tente de novo.')
      return
    }
    setUploading(true)
    setError(null)
    try {
      const img = await uploadImage(token, file, altText.trim())
      onUploaded(img)
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Não foi possível enviar a imagem.',
      )
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="border-border grid gap-3 rounded-xl border p-4">
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
          className={`text-fg-muted hover:border-primary flex flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-sm ${
            dragging ? 'border-primary' : 'border-border-strong'
          }`}
        >
          <UploadIcon />
          <span>
            Arraste ou{' '}
            <span className="text-primary font-bold">clique para selecionar</span>
          </span>
          <span className="text-fg-muted text-xs">PNG, JPG, WebP — máx. 5 MB</span>
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
          <label className="field-label" htmlFor="image-alt-text">
            Texto alternativo <span className="text-danger">*</span>
          </label>
          <p className="text-fg-muted text-xs">
            Descreva a imagem para quem usa leitor de tela. Ex.: &ldquo;Vista do
            território ao pôr do sol&rdquo;.
          </p>
          <textarea
            id="image-alt-text"
            className="field-input resize-none"
            rows={2}
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            placeholder="Descreva o conteúdo visual…"
          />
        </div>
      ) : null}

      {storage ? <StorageHint storage={storage} /> : null}
      {error ? (
        <p role="alert" className="field-error">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
          Cancelar
        </button>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={submit}
          disabled={uploading || !file || !altText.trim()}
        >
          {uploading ? (
            <>
              <span className="btn-spinner" aria-hidden="true" />
              Enviando…
            </>
          ) : (
            'Usar esta imagem'
          )}
        </button>
      </div>
    </div>
  )
}

function LibraryPanel({
  currentUrl,
  onPick,
  onCancel,
}: {
  currentUrl: string | null
  onPick: (image: AdminImage) => void
  onCancel: () => void
}) {
  const { getAccessToken } = useAuth()
  const [images, setImages] = useState<AdminImage[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const token = getAccessToken()
        if (!token) throw new Error('sem sessão')
        const imgs = await listImages(token)
        if (active) setImages(imgs)
      } catch {
        if (active) setError('Não foi possível carregar o acervo.')
      }
    })()
    return () => {
      active = false
    }
  }, [getAccessToken])

  return (
    <div className="border-border grid gap-3 rounded-xl border p-4">
      {error ? (
        <p role="alert" className="field-error">
          {error}
        </p>
      ) : images === null ? (
        <p className="text-fg-muted text-sm">Carregando acervo…</p>
      ) : images.length === 0 ? (
        <p className="text-fg-muted text-sm">
          Nenhuma imagem no acervo ainda. Use &ldquo;Enviar imagem&rdquo;.
        </p>
      ) : (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((img) => (
            <li key={img.filename}>
              <button
                type="button"
                onClick={() => onPick(img)}
                aria-label={img.altText ?? img.filename}
                className={`bg-bg-subtle relative block aspect-square w-full overflow-hidden rounded-lg border-2 ${
                  img.url === currentUrl ? 'border-primary' : 'border-transparent'
                }`}
              >
                <Image src={img.url} alt="" fill unoptimized className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex justify-end">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </div>
  )
}

function StorageHint({ storage }: { storage: StorageUsage }) {
  const level =
    storage.percent >= 95 ? 'danger' : storage.percent >= 80 ? 'warn' : 'ok'
  return (
    <div className="grid gap-1">
      <progress
        className={styles.storageBar}
        data-level={level}
        max={100}
        value={Math.min(storage.percent, 100)}
        aria-label="Uso de armazenamento da comunidade"
      />
      <span className="text-fg-muted text-xs">
        {storage.usedMb.toFixed(1)} MB de {storage.limitMb} MB usados
      </span>
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
