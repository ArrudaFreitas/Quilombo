"use client";

import { useEffect, useState } from "react";
import {
  createSection,
  deleteSection,
  getPage,
  getStyles,
  reorderSections,
  toggleSection,
  updateSectionContent,
  updateStyle,
  type AdminFetcher,
} from "@/lib/api/admin";
import type { AdminPage, AdminSectionItem, StylesCatalog } from "@/lib/api/types";
import { defaultContentFor, SECTION_SCHEMAS } from "@/sections/schemas";
import { sectionLabel, SECTION_TYPES, type SectionType } from "@/sections/types";
import { SectionEditor } from "./SectionEditor";
import {
  Feedback,
  PanelLoading,
  btnDanger,
  btnPrimary,
  btnSecondary,
  errorMessage,
  inputClass,
} from "./ui";

const SECTIONS_LIMIT = 20;

/**
 * Aba "Página": tema (estilo + paleta) e seções da página institucional.
 * Toda mutação devolve a página completa — o estado local é sempre o espelho
 * do backend, sem sincronização manual.
 */
export function PageTab({ adminFetch }: { adminFetch: AdminFetcher }) {
  const [page, setPage] = useState<AdminPage | null>(null);
  const [styles, setStyles] = useState<StylesCatalog | null>(null);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [newType, setNewType] = useState<SectionType>("hero");

  useEffect(() => {
    Promise.all([getPage(adminFetch), getStyles(adminFetch)])
      .then(([pageRes, stylesRes]) => {
        setPage(pageRes.data);
        setStyles(stylesRes.data);
      })
      .catch((error) => setFeedback({ kind: "error", text: errorMessage(error) }));
  }, [adminFetch]);

  if (!page || !styles) {
    return (
      <>
        {feedback && <Feedback kind={feedback.kind}>{feedback.text}</Feedback>}
        {!feedback && <PanelLoading />}
      </>
    );
  }

  /** Executa uma mutação que devolve a página inteira e atualiza o estado. */
  async function mutate(
    action: () => Promise<{ data: AdminPage }>,
    successText: string,
  ) {
    setBusy(true);
    setFeedback(null);
    try {
      const { data } = await action();
      setPage(data);
      setFeedback({ kind: "success", text: successText });
    } catch (error) {
      setFeedback({ kind: "error", text: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  }

  const sections = [...page.sections].sort((a, b) => a.orderIndex - b.orderIndex);

  function moveSection(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= sections.length) return;
    const ids = sections.map((section) => section.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    void mutate(() => reorderSections(adminFetch, ids), "Ordem atualizada.");
  }

  return (
    <div className="flex flex-col gap-8">
      {feedback && <Feedback kind={feedback.kind}>{feedback.text}</Feedback>}

      <section aria-labelledby="tema-titulo" className="flex flex-col gap-4">
        <h2 id="tema-titulo" className="text-2xl text-foreground">
          Tema da página
        </h2>
        <p className="max-w-prose text-sm text-subtle">
          O estilo define a estrutura visual e a paleta define as cores. Trocar
          qualquer um deles nunca altera o conteúdo das seções.
        </p>
        <ThemePicker
          styles={styles}
          currentStyle={page.style}
          currentPalette={page.palette}
          busy={busy}
          onApply={(style, palette) =>
            void mutate(
              () => updateStyle(adminFetch, { style, palette }),
              "Tema atualizado.",
            )
          }
        />
      </section>

      <section aria-labelledby="secoes-titulo" className="flex flex-col gap-4">
        <h2 id="secoes-titulo" className="text-2xl text-foreground">
          Seções ({sections.length}/{SECTIONS_LIMIT})
        </h2>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void mutate(
              () =>
                createSection(adminFetch, {
                  sectionType: newType,
                  content: defaultContentFor(newType),
                }),
              "Seção adicionada — edite o conteúdo dela abaixo.",
            );
          }}
          className="flex flex-wrap items-end gap-2"
        >
          <div className="flex flex-col gap-1">
            <label htmlFor="nova-secao-tipo" className="text-sm font-bold text-foreground">
              Tipo da nova seção
            </label>
            <select
              id="nova-secao-tipo"
              value={newType}
              onChange={(event) => setNewType(event.target.value as SectionType)}
              className={inputClass}
            >
              {SECTION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {SECTION_SCHEMAS[type].label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={busy || sections.length >= SECTIONS_LIMIT}
            className={btnPrimary}
          >
            + Adicionar seção
          </button>
          {sections.length >= SECTIONS_LIMIT && (
            <p className="text-sm font-bold text-accent">
              Limite de {SECTIONS_LIMIT} seções atingido.
            </p>
          )}
        </form>

        {sections.length === 0 ? (
          <p className="text-muted">
            A página ainda não tem seções — adicione a primeira acima.
          </p>
        ) : (
          <ol className="flex flex-col gap-3">
            {sections.map((section, index) => (
              <li key={section.id}>
                <SectionRow
                  section={section}
                  position={index + 1}
                  total={sections.length}
                  busy={busy}
                  editing={editingId === section.id}
                  adminFetch={adminFetch}
                  onMoveUp={() => moveSection(index, -1)}
                  onMoveDown={() => moveSection(index, 1)}
                  onToggle={() =>
                    void mutate(
                      () => toggleSection(adminFetch, section.id),
                      section.active ? "Seção ocultada." : "Seção publicada.",
                    )
                  }
                  onDelete={() => {
                    if (
                      window.confirm(
                        `Excluir a seção "${sectionLabel(section)}"? Essa ação não tem volta.`,
                      )
                    ) {
                      void mutate(
                        () => deleteSection(adminFetch, section.id),
                        "Seção excluída.",
                      );
                    }
                  }}
                  onEdit={() => setEditingId(section.id)}
                  onCancelEdit={() => setEditingId(null)}
                  onSaveContent={(content) =>
                    void mutate(
                      () => updateSectionContent(adminFetch, section.id, content),
                      "Conteúdo da seção salvo.",
                    ).then(() => setEditingId(null))
                  }
                />
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

/* ── Tema: estilo + paleta com swatches reais (pintados pelos tokens) ──── */

function ThemePicker({
  styles,
  currentStyle,
  currentPalette,
  busy,
  onApply,
}: {
  styles: StylesCatalog;
  currentStyle: string;
  currentPalette: string;
  busy: boolean;
  onApply: (style: string, palette: string) => void;
}) {
  const [style, setStyle] = useState(currentStyle);
  const [palette, setPalette] = useState(currentPalette);
  const palettes = styles[style]?.palettes ?? [];
  const dirty = style !== currentStyle || palette !== currentPalette;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onApply(style, palette);
      }}
      className="flex flex-col gap-4"
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-bold text-foreground">Estilo</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(styles).map(([id, option]) => (
            <label
              key={id}
              className={`cursor-pointer rounded-theme-sm border px-4 py-3 font-bold ${
                style === id
                  ? "border-primary bg-secondary text-foreground"
                  : "border-border bg-surface-raised text-muted"
              }`}
            >
              <input
                type="radio"
                name="estilo"
                value={id}
                checked={style === id}
                onChange={() => {
                  setStyle(id);
                  if (!styles[id].palettes.includes(palette)) {
                    setPalette(styles[id].palettes[0]);
                  }
                }}
                className="sr-only"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-bold text-foreground">Paleta de cores</legend>
        <div className="flex flex-wrap gap-2">
          {palettes.map((id) => (
            <label
              key={id}
              data-palette={id}
              className={`flex cursor-pointer items-center gap-2 rounded-theme-sm border px-4 py-3 font-bold capitalize ${
                palette === id
                  ? "border-border-strong bg-secondary text-foreground"
                  : "border-border bg-surface-raised text-muted"
              }`}
            >
              <input
                type="radio"
                name="paleta"
                value={id}
                checked={palette === id}
                onChange={() => setPalette(id)}
                className="sr-only"
              />
              {/* o swatch usa os próprios tokens da paleta (data-palette acima) */}
              <span aria-hidden="true" className="size-4 rounded-full bg-primary" />
              {id}
            </label>
          ))}
        </div>
      </fieldset>

      <button type="submit" disabled={busy || !dirty} className={`${btnPrimary} self-start`}>
        Aplicar tema
      </button>
    </form>
  );
}

/* ── Linha de seção: metadados + ações + editor expandido ──────────────── */

function SectionRow({
  section,
  position,
  total,
  busy,
  editing,
  adminFetch,
  onMoveUp,
  onMoveDown,
  onToggle,
  onDelete,
  onEdit,
  onCancelEdit,
  onSaveContent,
}: {
  section: AdminSectionItem;
  position: number;
  total: number;
  busy: boolean;
  editing: boolean;
  adminFetch: AdminFetcher;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaveContent: (content: Record<string, unknown>) => void;
}) {
  const schema = SECTION_SCHEMAS[section.sectionType as SectionType];
  const name = sectionLabel(section);

  return (
    <article className="flex flex-col gap-4 rounded-theme-sm border border-border bg-surface-raised p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col">
          <h3 className="text-lg text-foreground">{name}</h3>
          <p className="text-xs text-subtle">
            {schema?.label ?? section.sectionType}
            {!section.active && (
              <span className="ml-2 rounded-theme-sm bg-background-subtle px-2 py-0.5 font-bold">
                Oculta
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={busy || position === 1}
            aria-label={`Mover a seção ${name} para cima`}
            className={btnSecondary}
          >
            ↑
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={busy || position === total}
            aria-label={`Mover a seção ${name} para baixo`}
            className={btnSecondary}
          >
            ↓
          </button>
          <button type="button" onClick={onToggle} disabled={busy} className={btnSecondary}>
            {section.active ? "Ocultar" : "Publicar"}
          </button>
          {editing ? (
            <button type="button" onClick={onCancelEdit} className={btnSecondary}>
              Fechar edição
            </button>
          ) : (
            <button type="button" onClick={onEdit} disabled={busy} className={btnSecondary}>
              Editar conteúdo
            </button>
          )}
          <button type="button" onClick={onDelete} disabled={busy} className={btnDanger}>
            Excluir
          </button>
        </div>
      </div>

      {editing && (
        <SectionEditor
          section={section}
          adminFetch={adminFetch}
          saving={busy}
          onSave={onSaveContent}
          onCancel={onCancelEdit}
        />
      )}
    </article>
  );
}
