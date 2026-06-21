'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/auth/auth-provider'
import { getStorage, type StorageUsage } from '@/lib/api/admin/media'
import {
  createSection,
  deleteSection,
  getPage,
  reorderSections,
  toggleSection,
  updateSectionContent,
  updateStyle,
  type AdminPage,
  type SectionContent,
} from '@/lib/api/admin/page'
import { FieldRenderer, ImageQuotaProvider } from './fields'
import { getPalettesForStyle, STYLES } from './page-styles'
import {
  getDefaultContent,
  SCHEMA_BY_TYPE,
  SECTION_SCHEMAS,
} from './section-schemas'
import styles from './page.module.css'

const SECTIONS_LIMIT = 20

type Status = 'loading' | 'ready' | 'error'
type SaveState = 'idle' | 'ok' | 'error'

/** Seção no rascunho local. `id` é `null` enquanto não foi persistida (isNew). */
interface DraftSection {
  key: string
  id: number | null
  sectionType: string
  active: boolean
  content: SectionContent
  isNew: boolean
}

const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

let newCounter = 0

/**
 * Aba "Páginas": editor da página institucional — porte do `PageConfig` do MVP
 * com o design system do `final`. Biblioteca de seções (adicionar), editor
 * central (editar/reordenar/ativar/remover) e painel de estilo+paleta. Edição é
 * local; "Salvar" aplica o diff contra o snapshot carregado, e cada chamada do
 * backend devolve a página completa (fonte de verdade reaplicada ao fim).
 */
export function PageTab() {
  const { getAccessToken } = useAuth()
  const [status, setStatus] = useState<Status>('loading')
  const [sections, setSections] = useState<DraftSection[]>([])
  const [origSections, setOrigSections] = useState<DraftSection[]>([])
  const [style, setStyle] = useState('uniao')
  const [palette, setPalette] = useState('verde')
  const [origStyle, setOrigStyle] = useState('uniao')
  const [origPalette, setOrigPalette] = useState('verde')
  const [storage, setStorage] = useState<StorageUsage | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')

  function applyPage(page: AdminPage) {
    const drafts: DraftSection[] = page.sections.map((s) => ({
      key: String(s.id),
      id: s.id,
      sectionType: s.sectionType,
      active: s.active,
      content: s.content,
      isNew: false,
    }))
    setSections(drafts)
    setOrigSections(structuredClone(drafts))
    setStyle(page.style)
    setOrigStyle(page.style)
    setPalette(page.palette)
    setOrigPalette(page.palette)
  }

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const token = getAccessToken()
        if (!token) throw new Error('sem sessão')
        const [page, usage] = await Promise.all([
          getPage(token),
          getStorage(token),
        ])
        if (!active) return
        applyPage(page)
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
      /* mantém a quota anterior */
    }
  }

  // ── operações locais ────────────────────────────────────────────────────────
  function addSection(type: string) {
    if (sections.length >= SECTIONS_LIMIT) return
    newCounter += 1
    setSections((prev) => [
      ...prev,
      {
        key: `new-${newCounter}`,
        id: null,
        sectionType: type,
        active: true,
        content: getDefaultContent(type),
        isNew: true,
      },
    ])
  }
  function updateContent(key: string, content: SectionContent) {
    setSections((prev) =>
      prev.map((s) => (s.key === key ? { ...s, content } : s)),
    )
  }
  function toggleActive(key: string) {
    setSections((prev) =>
      prev.map((s) => (s.key === key ? { ...s, active: !s.active } : s)),
    )
  }
  function removeSection(key: string) {
    setSections((prev) => prev.filter((s) => s.key !== key))
  }
  function moveSection(key: string, dir: -1 | 1) {
    setSections((prev) => {
      const i = prev.findIndex((s) => s.key === key)
      const j = i + dir
      if (i < 0 || j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  function changeStyle(next: string) {
    setStyle(next)
    const palettes = getPalettesForStyle(next)
    if (!palettes.some((p) => p.id === palette))
      setPalette(palettes[0]?.id ?? 'verde')
  }

  // ── salvar (diff incremental) ────────────────────────────────────────────────
  async function handleSave() {
    const token = getAccessToken()
    if (!token) return
    setSaving(true)
    setSaveState('idle')
    try {
      // 1. remover seções que saíram
      const currentRealIds = new Set(
        sections.filter((s) => !s.isNew).map((s) => s.id as number),
      )
      for (const o of origSections) {
        if (o.id != null && !currentRealIds.has(o.id)) {
          await deleteSection(token, o.id)
        }
      }

      // 2. criar novas (sequencial) e mapear key→id real pelo diff da resposta
      const knownIds = new Set<number>(currentRealIds)
      const idMap = new Map<string, number>()
      for (const s of sections.filter((s) => s.isNew)) {
        const page = await createSection(token, s.sectionType, s.content)
        const created = page.sections.find((ps) => !knownIds.has(ps.id))
        if (created) {
          idMap.set(s.key, created.id)
          knownIds.add(created.id)
        }
      }

      // 3. conteúdo + visibilidade das existentes que mudaram
      for (const s of sections.filter((s) => !s.isNew)) {
        const orig = origSections.find((o) => o.id === s.id)
        if (orig && !eq(orig.content, s.content)) {
          await updateSectionContent(token, s.id as number, s.content)
        }
        if (orig && orig.active !== s.active) {
          await toggleSection(token, s.id as number)
        }
      }

      // 4. reordenar com a ordem final (ids reais; novos via idMap)
      const orderedIds = sections
        .map((s) => (s.isNew ? idMap.get(s.key) : s.id))
        .filter((x): x is number => x != null)
      let finalPage: AdminPage | null = null
      if (orderedIds.length > 0) {
        finalPage = await reorderSections(token, orderedIds)
      }

      // 5. estilo / paleta
      if (style !== origStyle || palette !== origPalette) {
        finalPage = await updateStyle(token, style, palette)
      }

      applyPage(finalPage ?? (await getPage(token)))
      setSaveState('ok')
    } catch {
      setSaveState('error')
    } finally {
      setSaving(false)
    }
  }

  const dirty =
    style !== origStyle ||
    palette !== origPalette ||
    sections.length !== origSections.length ||
    sections.some((s, i) => {
      if (s.isNew) return true
      const orig = origSections.find((o) => o.id === s.id)
      if (!orig) return true
      return (
        !eq(orig.content, s.content) ||
        orig.active !== s.active ||
        origSections.indexOf(orig) !== i
      )
    })

  if (status === 'loading') {
    return (
      <p role="status" className="text-fg-muted py-16 text-center">
        Carregando a página…
      </p>
    )
  }
  if (status === 'error') {
    return (
      <p role="alert" className="text-fg-muted py-16 text-center">
        Não foi possível carregar a página. Recarregue.
      </p>
    )
  }

  return (
    <ImageQuotaProvider value={{ storage, refreshStorage }}>
      <div className="grid gap-6 py-8 lg:grid-cols-[14rem_minmax(0,1fr)_15rem]">
        <SectionLibrary count={sections.length} onAdd={addSection} />

        <div className="grid content-start gap-4">
          <header>
            <h1 className="font-display text-fg text-2xl font-semibold">
              Página institucional
            </h1>
            <p className="text-fg-muted mt-1 text-balance">
              Monte as seções da sua página. Clique em uma para editar; use as
              setas para reordenar, ◉ para ativar/desativar e ✕ para remover.
            </p>
          </header>

          {sections.length === 0 ? (
            <div className="border-border text-fg-muted rounded-xl border border-dashed py-16 text-center text-balance">
              Nenhuma seção ainda. Adicione pela coluna à esquerda.
            </div>
          ) : (
            <div className="grid gap-3">
              {sections.map((section, i) => (
                <SectionEditor
                  key={section.key}
                  section={section}
                  index={i}
                  total={sections.length}
                  onUpdateContent={(content) =>
                    updateContent(section.key, content)
                  }
                  onToggle={() => toggleActive(section.key)}
                  onRemove={() => removeSection(section.key)}
                  onMove={(dir) => moveSection(section.key, dir)}
                />
              ))}
            </div>
          )}
        </div>

        <StylePanel
          style={style}
          palette={palette}
          onStyle={changeStyle}
          onPalette={setPalette}
          onSave={handleSave}
          saving={saving}
          saveState={saveState}
          dirty={dirty}
        />
      </div>
    </ImageQuotaProvider>
  )
}

// ── coluna esquerda: biblioteca de tipos ───────────────────────────────────────
function SectionLibrary({
  count,
  onAdd,
}: {
  count: number
  onAdd: (type: string) => void
}) {
  const [open, setOpen] = useState(true)
  const full = count >= SECTIONS_LIMIT
  return (
    <aside className="grid content-start gap-2">
      <button
        type="button"
        className="surface hover:border-primary flex items-center justify-between gap-2 p-3"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="section-library-list"
      >
        <span className="grid text-left">
          <span className="font-display text-fg text-lg font-semibold">
            Adicionar seção
          </span>
          <span className="text-fg-subtle text-xs">
            {count}/{SECTIONS_LIMIT} seções na página
          </span>
        </span>
        <span className="text-fg-subtle text-lg" aria-hidden="true">
          {open ? '▾' : '▸'}
        </span>
      </button>

      {open ? (
        <div id="section-library-list" className="grid gap-2">
          {SECTION_SCHEMAS.map((schema) => (
            <button
              key={schema.type}
              type="button"
              className="surface hover:border-primary grid gap-0.5 p-3 text-left disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => onAdd(schema.type)}
              disabled={full}
              title={schema.description}
            >
              <span className="text-fg text-sm font-bold">{schema.label}</span>
              <span className="text-fg-subtle line-clamp-2 text-xs">
                {schema.description}
              </span>
            </button>
          ))}
          {full ? (
            <p className="text-fg-subtle text-xs">
              Limite de {SECTIONS_LIMIT} atingido.
            </p>
          ) : null}
        </div>
      ) : null}
    </aside>
  )
}

// ── editor de uma seção ─────────────────────────────────────────────────────────
function SectionEditor({
  section,
  index,
  total,
  onUpdateContent,
  onToggle,
  onRemove,
  onMove,
}: {
  section: DraftSection
  index: number
  total: number
  onUpdateContent: (content: SectionContent) => void
  onToggle: () => void
  onRemove: () => void
  onMove: (dir: -1 | 1) => void
}) {
  const [expanded, setExpanded] = useState(section.isNew)
  const schema = SCHEMA_BY_TYPE[section.sectionType]
  if (!schema) return null

  return (
    <div
      className={`surface overflow-hidden ${section.active ? '' : 'opacity-60'}`}
    >
      <div className="flex items-center gap-2 p-3">
        <button
          type="button"
          className="flex flex-1 items-center gap-2 text-left"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
        >
          <span className="text-fg-subtle" aria-hidden="true">
            {expanded ? '▾' : '▸'}
          </span>
          <span className="text-fg font-bold">{schema.label}</span>
          {!section.active ? <span className="badge">Inativa</span> : null}
          {section.isNew ? (
            <span className="text-success text-xs font-bold">Nova</span>
          ) : null}
        </button>
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
            onClick={onToggle}
            aria-label={section.active ? 'Desativar seção' : 'Ativar seção'}
            title={section.active ? 'Desativar' : 'Ativar'}
          >
            {section.active ? '◉' : '◎'}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onRemove}
            aria-label="Remover seção"
          >
            ✕
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="border-border grid gap-4 border-t p-4">
          <p className="text-fg-subtle text-sm">{schema.description}</p>
          {schema.fields.map((field) => (
            <FieldRenderer
              key={field.key}
              field={field}
              value={section.content[field.key]}
              onChange={(v) =>
                onUpdateContent({ ...section.content, [field.key]: v })
              }
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

// ── coluna direita: estilo + paleta + salvar ────────────────────────────────────
function StylePanel({
  style,
  palette,
  onStyle,
  onPalette,
  onSave,
  saving,
  saveState,
  dirty,
}: {
  style: string
  palette: string
  onStyle: (id: string) => void
  onPalette: (id: string) => void
  onSave: () => void
  saving: boolean
  saveState: SaveState
  dirty: boolean
}) {
  const palettes = getPalettesForStyle(style)
  return (
    <aside className="grid content-start gap-5 lg:sticky lg:top-6 lg:self-start">
      <div className="grid gap-3">
        <div>
          <h2 className="font-display text-fg text-lg font-semibold">Estilo</h2>
          <p className="text-fg-subtle text-sm text-balance">
            Muda a aparência (tipografia, formas, sombras). O conteúdo não é
            afetado.
          </p>
        </div>
        <div className="grid gap-2">
          {Object.values(STYLES).map((s) => (
            <button
              key={s.id}
              type="button"
              className={`surface flex items-center gap-3 p-3 text-left ${
                style === s.id ? 'border-primary' : ''
              }`}
              onClick={() => onStyle(s.id)}
              aria-pressed={style === s.id}
            >
              <span
                className={styles.styleSwatch}
                data-style={s.id}
                aria-hidden="true"
              >
                <span className={styles.styleDot} data-style={s.id} />
              </span>
              <span className="grid">
                <span className="text-fg text-sm font-bold">{s.label}</span>
                <span className="text-fg-subtle line-clamp-2 text-xs">
                  {s.description}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3">
        <h2 className="font-display text-fg text-lg font-semibold">Paleta</h2>
        <div className="flex flex-wrap gap-2">
          {palettes.map((p) => (
            <button
              key={p.id}
              type="button"
              className={styles.paletteSwatch}
              data-palette={p.id}
              data-selected={palette === p.id}
              onClick={() => onPalette(p.id)}
              aria-pressed={palette === p.id}
              aria-label={p.label}
              title={p.label}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-2">
        {saveState === 'ok' ? (
          <span role="status" className="text-success text-sm font-bold">
            ✓ Alterações salvas
          </span>
        ) : null}
        {saveState === 'error' ? (
          <span role="alert" className="text-danger text-sm">
            Erro ao salvar. Tente de novo.
          </span>
        ) : null}
        {dirty && saveState !== 'ok' ? (
          <span className="text-fg-subtle text-sm">
            Há alterações não salvas.
          </span>
        ) : null}
        <button
          type="button"
          className="btn btn-primary"
          onClick={onSave}
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
    </aside>
  )
}
