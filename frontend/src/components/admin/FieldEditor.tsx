"use client";

import { useState } from "react";
import type { AdminFetcher } from "@/lib/api/admin";
import type {
  ListField,
  PillsField,
  RichContentField,
  SectionField,
  SimpleField,
} from "@/sections/schemas";
import type { ImageRef } from "@/sections/types";
import { ImagePickerDialog } from "./ImagePickerDialog";
import { btnSecondary, inputClass } from "./ui";

/**
 * Editores de campo guiados pelos schemas de seção. Cada editor é controlado:
 * recebe o valor atual e devolve o novo via onChange — o estado mora no
 * SectionEditor. Todos os controles têm label visível (WCAG 3.3.2).
 */

interface FieldEditorProps {
  field: SectionField;
  value: unknown;
  onChange: (value: unknown) => void;
  adminFetch: AdminFetcher;
  idPrefix: string;
}

export function FieldEditor(props: FieldEditorProps) {
  const { field } = props;
  switch (field.kind) {
    case "text":
    case "textarea":
    case "checkbox":
    case "image":
      return <SimpleFieldEditor {...props} field={field as SimpleField} />;
    case "pills":
      return <PillsEditor {...props} field={field as PillsField} />;
    case "list":
      return <ListEditor {...props} field={field as ListField} />;
    case "richcontent":
      return <RichContentEditor {...props} field={field as RichContentField} />;
  }
}

/* ── Campos simples (também usados dentro de listas e blocos) ──────────── */

function SimpleFieldEditor({
  field,
  value,
  onChange,
  adminFetch,
  idPrefix,
}: {
  field: SimpleField;
  value: unknown;
  onChange: (value: unknown) => void;
  adminFetch: AdminFetcher;
  idPrefix: string;
}) {
  const id = `${idPrefix}-${field.key}`;

  if (field.kind === "checkbox") {
    return (
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
          className="size-4"
        />
        <label htmlFor={id} className="text-sm font-bold text-foreground">
          {field.label}
        </label>
      </div>
    );
  }

  if (field.kind === "image") {
    return (
      <ImageFieldEditor
        field={field}
        value={value as ImageRef | undefined}
        onChange={onChange}
        adminFetch={adminFetch}
      />
    );
  }

  const text = typeof value === "string" ? value : "";
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-bold text-foreground">
        {field.label}
        {field.required && (
          <span className="text-accent" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </label>
      {field.kind === "textarea" ? (
        <textarea
          id={id}
          value={text}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder}
          maxLength={field.maxLength}
          rows={field.rows ?? 3}
          required={field.required}
          className={inputClass}
        />
      ) : (
        <input
          id={id}
          type="text"
          value={text}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder}
          maxLength={field.maxLength}
          required={field.required}
          className={inputClass}
        />
      )}
      {field.hint && <p className="text-xs text-subtle">{field.hint}</p>}
    </div>
  );
}

function ImageFieldEditor({
  field,
  value,
  onChange,
  adminFetch,
}: {
  field: SimpleField;
  value: ImageRef | undefined;
  onChange: (value: unknown) => void;
  adminFetch: AdminFetcher;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const image = value && value.url ? value : null;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-bold text-foreground">{field.label}</p>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image.url!}
          alt={image.alt_text}
          className="aspect-[4/3] w-full max-w-48 rounded-theme-sm object-cover"
        />
      ) : (
        <p className="text-xs text-subtle">Nenhuma imagem escolhida.</p>
      )}
      <div className="flex gap-2">
        <button type="button" onClick={() => setPickerOpen(true)} className={btnSecondary}>
          {image ? "Trocar" : "Escolher imagem"}
        </button>
        {image && (
          <button
            type="button"
            onClick={() => onChange({ url: null, alt_text: "" })}
            className={btnSecondary}
          >
            Remover
          </button>
        )}
      </div>
      <ImagePickerDialog
        adminFetch={adminFetch}
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(selected) => onChange(selected)}
      />
    </div>
  );
}

/* ── Pills: lista de textos curtos ─────────────────────────────────────── */

function PillsEditor({
  field,
  value,
  onChange,
  idPrefix,
}: {
  field: PillsField;
  value: unknown;
  onChange: (value: unknown) => void;
  idPrefix: string;
}) {
  const pills = Array.isArray(value) ? (value as string[]) : [];
  const canAdd = !field.maxItems || pills.length < field.maxItems;

  return (
    <fieldset className="flex flex-col gap-2 rounded-theme-sm border border-border p-3">
      <legend className="px-1 text-sm font-bold text-foreground">{field.label}</legend>
      {field.hint && <p className="text-xs text-subtle">{field.hint}</p>}
      {pills.map((pill, index) => (
        <div key={index} className="flex items-center gap-2">
          <label htmlFor={`${idPrefix}-${field.key}-${index}`} className="sr-only">
            {field.label} {index + 1}
          </label>
          <input
            id={`${idPrefix}-${field.key}-${index}`}
            type="text"
            value={pill}
            maxLength={field.itemMaxLength}
            onChange={(event) =>
              onChange(pills.map((p, i) => (i === index ? event.target.value : p)))
            }
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => onChange(pills.filter((_, i) => i !== index))}
            className={btnSecondary}
          >
            Remover
          </button>
        </div>
      ))}
      <button
        type="button"
        disabled={!canAdd}
        onClick={() => onChange([...pills, ""])}
        className={`${btnSecondary} self-start`}
      >
        + Adicionar
      </button>
    </fieldset>
  );
}

/* ── Listas estruturadas (cards, eventos, marcos) ──────────────────────── */

function ListEditor({
  field,
  value,
  onChange,
  adminFetch,
  idPrefix,
}: {
  field: ListField;
  value: unknown;
  onChange: (value: unknown) => void;
  adminFetch: AdminFetcher;
  idPrefix: string;
}) {
  const items = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
  const canAdd = !field.maxItems || items.length < field.maxItems;

  function updateItem(index: number, key: string, newValue: unknown) {
    onChange(
      items.map((item, i) => (i === index ? { ...item, [key]: newValue } : item)),
    );
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <fieldset className="flex flex-col gap-3 rounded-theme-sm border border-border p-3">
      <legend className="px-1 text-sm font-bold text-foreground">{field.label}</legend>
      {items.map((item, index) => (
        <div
          key={index}
          className="flex flex-col gap-3 rounded-theme-sm border border-border bg-surface p-3"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="font-bold text-foreground">
              {field.itemLabel} {index + 1}
            </p>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                aria-label={`Mover ${field.itemLabel} ${index + 1} para cima`}
                className={btnSecondary}
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === items.length - 1}
                aria-label={`Mover ${field.itemLabel} ${index + 1} para baixo`}
                className={btnSecondary}
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => onChange(items.filter((_, i) => i !== index))}
                className={btnSecondary}
              >
                Remover
              </button>
            </div>
          </div>
          {field.itemFields.map((itemField) => (
            <SimpleFieldEditor
              key={itemField.key}
              field={itemField}
              value={item[itemField.key]}
              onChange={(newValue) => updateItem(index, itemField.key, newValue)}
              adminFetch={adminFetch}
              idPrefix={`${idPrefix}-${field.key}-${index}`}
            />
          ))}
        </div>
      ))}
      <button
        type="button"
        disabled={!canAdd}
        onClick={() => onChange([...items, structuredClone(field.itemDefault)])}
        className={`${btnSecondary} self-start`}
      >
        + Adicionar {field.itemLabel.toLowerCase()}
      </button>
    </fieldset>
  );
}

/* ── Richcontent: blocos editoriais livres ─────────────────────────────── */

function RichContentEditor({
  field,
  value,
  onChange,
  adminFetch,
  idPrefix,
}: {
  field: RichContentField;
  value: unknown;
  onChange: (value: unknown) => void;
  adminFetch: AdminFetcher;
  idPrefix: string;
}) {
  const blocks = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];

  function updateBlock(index: number, key: string, newValue: unknown) {
    onChange(
      blocks.map((block, i) => (i === index ? { ...block, [key]: newValue } : block)),
    );
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <fieldset className="flex flex-col gap-3 rounded-theme-sm border border-border p-3">
      <legend className="px-1 text-sm font-bold text-foreground">{field.label}</legend>
      {blocks.map((block, index) => {
        const def = field.blocks.find((b) => b.type === block.type);
        if (!def) {
          return null; // bloco de versão futura: preservado no JSON, não editável
        }
        return (
          <div
            key={index}
            className="flex flex-col gap-3 rounded-theme-sm border border-border bg-surface p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-bold text-foreground">{def.label}</p>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label={`Mover bloco ${index + 1} para cima`}
                  className={btnSecondary}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === blocks.length - 1}
                  aria-label={`Mover bloco ${index + 1} para baixo`}
                  className={btnSecondary}
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => onChange(blocks.filter((_, i) => i !== index))}
                  className={btnSecondary}
                >
                  Remover
                </button>
              </div>
            </div>
            {def.fields.map((blockField) => (
              <SimpleFieldEditor
                key={blockField.key}
                field={blockField}
                value={block[blockField.key]}
                onChange={(newValue) => updateBlock(index, blockField.key, newValue)}
                adminFetch={adminFetch}
                idPrefix={`${idPrefix}-${field.key}-${index}`}
              />
            ))}
          </div>
        );
      })}
      <div className="flex flex-wrap gap-2">
        {field.blocks.map((def) => (
          <button
            key={def.type}
            type="button"
            onClick={() => onChange([...blocks, structuredClone(def.defaultValue)])}
            className={btnSecondary}
          >
            + {def.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
