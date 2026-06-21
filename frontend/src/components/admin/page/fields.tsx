'use client'

import { createContext, useContext, useId, useState } from 'react'
import type { StorageUsage } from '@/lib/api/admin/media'
import { ImageField } from '../image-field'
import type { SectionField } from './section-schemas'

/**
 * Renderizador de campos do editor de páginas — porte do `FieldRenderer` do MVP,
 * com o design system do `final`. Cada tipo de campo do schema vira um controle;
 * `cards`/`events`/`timeline` e `richcontent` recursam via {@link FieldRenderer}.
 * O caso `image` reaproveita o {@link ImageField} (acervo + upload), recebendo a
 * quota por contexto para não furar o prop-drilling na recursão.
 */

type ImageValue = { url: string | null; alt_text: string }

interface ImageQuota {
  storage: StorageUsage | null
  refreshStorage: () => void
}

const ImageQuotaContext = createContext<ImageQuota>({
  storage: null,
  refreshStorage: () => {},
})

export function ImageQuotaProvider({
  value,
  children,
}: {
  value: ImageQuota
  children: React.ReactNode
}) {
  return <ImageQuotaContext value={value}>{children}</ImageQuotaContext>
}

interface FieldProps {
  field: SectionField
  value: unknown
  onChange: (value: unknown) => void
}

function TextField({ field, value, onChange }: FieldProps) {
  const id = useId()
  const v = (value as string) ?? ''
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {field.label}
        {field.required ? <span className="text-danger"> *</span> : null}
      </label>
      {field.hint ? (
        <p className="text-fg-muted text-xs">{field.hint}</p>
      ) : null}
      <input
        id={id}
        type="text"
        className="field-input"
        value={v}
        maxLength={field.maxLength}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {field.maxLength ? (
        <span className="text-fg-muted text-xs">
          {v.length}/{field.maxLength}
        </span>
      ) : null}
    </div>
  )
}

function TextareaField({ field, value, onChange }: FieldProps) {
  const id = useId()
  const v = (value as string) ?? ''
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {field.label}
        {field.required ? <span className="text-danger"> *</span> : null}
      </label>
      {field.hint ? (
        <p className="text-fg-muted text-xs">{field.hint}</p>
      ) : null}
      <textarea
        id={id}
        className="field-input resize-none"
        rows={4}
        value={v}
        maxLength={field.maxLength}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {field.maxLength ? (
        <span className="text-fg-muted text-xs">
          {v.length}/{field.maxLength}
        </span>
      ) : null}
    </div>
  )
}

function CheckboxField({ field, value, onChange }: FieldProps) {
  const id = useId()
  return (
    <label htmlFor={id} className="text-fg flex items-center gap-2 text-sm">
      <input
        id={id}
        type="checkbox"
        checked={!!value}
        onChange={(e) => onChange(e.target.checked)}
      />
      {field.label}
    </label>
  )
}

function PillsField({ field, value, onChange }: FieldProps) {
  const items = (value as string[]) ?? []
  const max = field.maxItems ?? 6
  function update(i: number, v: string) {
    const next = [...items]
    next[i] = v
    onChange(next)
  }
  return (
    <div className="field">
      <label className="field-label">{field.label}</label>
      {field.hint ? (
        <p className="text-fg-muted text-xs">{field.hint}</p>
      ) : null}
      <div className="grid gap-2">
        {items.map((pill, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="text"
              className="field-input flex-1"
              value={pill}
              placeholder={field.placeholder}
              onChange={(e) => update(i, e.target.value)}
            />
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              aria-label="Remover etiqueta"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      {items.length < max ? (
        <button
          type="button"
          className="btn btn-ghost btn-sm justify-self-start"
          onClick={() => onChange([...items, ''])}
        >
          + Adicionar etiqueta
        </button>
      ) : null}
    </div>
  )
}

function ImageFieldControl({ field, value, onChange }: FieldProps) {
  const { storage, refreshStorage } = useContext(ImageQuotaContext)
  const img = (value as ImageValue | undefined) ?? { url: null, alt_text: '' }
  return (
    <div className="field">
      <label className="field-label">
        {field.label}
        {field.required ? <span className="text-danger"> *</span> : null}
      </label>
      {field.hint ? (
        <p className="text-fg-muted text-xs">{field.hint}</p>
      ) : null}
      <ImageField
        value={img.url}
        alt={img.alt_text}
        onChange={(url, alt) => onChange({ url, alt_text: alt ?? '' })}
        storage={storage}
        onUploaded={refreshStorage}
      />
    </div>
  )
}

/** Item de array (cards/events/timeline): cabeçalho com mover/remover + campos. */
function ArrayItemControls({
  index,
  total,
  onMove,
  onRemove,
}: {
  index: number
  total: number
  onMove: (dir: -1 | 1) => void
  onRemove: () => void
}) {
  return (
    <div className="flex shrink-0 gap-1">
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => onMove(-1)}
        disabled={index === 0}
        aria-label="Mover para cima"
      >
        ↑
      </button>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => onMove(1)}
        disabled={index === total - 1}
        aria-label="Mover para baixo"
      >
        ↓
      </button>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={onRemove}
        aria-label="Remover"
      >
        ✕
      </button>
    </div>
  )
}

function ArrayField({ field, value, onChange }: FieldProps) {
  const items = (value as Record<string, unknown>[]) ?? []
  const max = field.maxItems ?? 20
  const singular = field.label.toLowerCase().replace(/s$/, '')

  function updateItem(i: number, item: Record<string, unknown>) {
    const next = [...items]
    next[i] = item
    onChange(next)
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= items.length) return
    const next = [...items]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }

  return (
    <div className="field">
      <label className="field-label">{field.label}</label>
      {field.hint ? (
        <p className="text-fg-muted text-xs">{field.hint}</p>
      ) : null}
      <div className="grid gap-3">
        {items.map((item, i) => (
          <div key={i} className="border-border rounded-lg border p-3">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-fg-muted text-xs font-bold">#{i + 1}</span>
              <ArrayItemControls
                index={i}
                total={items.length}
                onMove={(dir) => move(i, dir)}
                onRemove={() => onChange(items.filter((_, idx) => idx !== i))}
              />
            </div>
            <div className="grid gap-3">
              {field.itemSchema?.map((sub) => (
                <FieldRenderer
                  key={sub.key}
                  field={sub}
                  value={item[sub.key]}
                  onChange={(v) => updateItem(i, { ...item, [sub.key]: v })}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      {items.length < max ? (
        <button
          type="button"
          className="btn btn-ghost btn-sm justify-self-start"
          onClick={() =>
            onChange([...items, structuredClone(field.defaultItem ?? {})])
          }
        >
          + Adicionar {singular}
        </button>
      ) : null}
      {field.minItems && items.length < field.minItems ? (
        <p className="text-danger text-xs">
          Mínimo de {field.minItems} {field.label.toLowerCase()}.
        </p>
      ) : null}
    </div>
  )
}

type Block = { type: string } & Record<string, unknown>

function RichContentField({ field, value, onChange }: FieldProps) {
  const [adding, setAdding] = useState(false)
  const blocks = (value as Block[]) ?? []
  const blockTypes = field.blockTypes ?? []
  const labelOf = (type: string) =>
    blockTypes.find((b) => b.type === type)?.label ?? type

  function updateBlock(i: number, key: string, v: unknown) {
    const next = [...blocks]
    next[i] = { ...next[i], [key]: v }
    onChange(next)
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= blocks.length) return
    const next = [...blocks]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }

  return (
    <div className="field">
      <label className="field-label">{field.label}</label>
      {field.hint ? (
        <p className="text-fg-muted text-xs">{field.hint}</p>
      ) : null}

      <div className="grid gap-3">
        {blocks.map((block, i) => {
          const bt = blockTypes.find((b) => b.type === block.type)
          if (!bt) return null
          return (
            <div key={i} className="border-border rounded-lg border p-3">
              <div className="mb-3 flex items-center justify-between">
                <span className="badge">{labelOf(block.type)}</span>
                <ArrayItemControls
                  index={i}
                  total={blocks.length}
                  onMove={(dir) => move(i, dir)}
                  onRemove={() =>
                    onChange(blocks.filter((_, idx) => idx !== i))
                  }
                />
              </div>
              <div className="grid gap-3">
                {bt.fields.map((sub) => (
                  <FieldRenderer
                    key={sub.key}
                    field={sub}
                    value={block[sub.key]}
                    onChange={(v) => updateBlock(i, sub.key, v)}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {adding ? (
        <div className="border-border grid gap-2 rounded-lg border border-dashed p-3">
          <span className="text-fg-muted text-sm font-bold">
            Tipo de bloco:
          </span>
          <div className="flex flex-wrap gap-2">
            {blockTypes.map((bt) => (
              <button
                key={bt.type}
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  onChange([...blocks, structuredClone(bt.defaultValue)])
                  setAdding(false)
                }}
              >
                {bt.label}
              </button>
            ))}
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setAdding(false)}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="btn btn-ghost btn-sm justify-self-start"
          onClick={() => setAdding(true)}
        >
          + Adicionar bloco
        </button>
      )}
    </div>
  )
}

/** Dispatcher: escolhe o controle pelo `field.type`. */
export function FieldRenderer({ field, value, onChange }: FieldProps) {
  switch (field.type) {
    case 'text':
      return <TextField field={field} value={value} onChange={onChange} />
    case 'textarea':
      return <TextareaField field={field} value={value} onChange={onChange} />
    case 'checkbox':
      return <CheckboxField field={field} value={value} onChange={onChange} />
    case 'pills':
      return <PillsField field={field} value={value} onChange={onChange} />
    case 'image':
      return (
        <ImageFieldControl field={field} value={value} onChange={onChange} />
      )
    case 'cards':
    case 'events':
    case 'timeline':
      return <ArrayField field={field} value={value} onChange={onChange} />
    case 'richcontent':
      return (
        <RichContentField field={field} value={value} onChange={onChange} />
      )
    default:
      return null
  }
}
