"use client";

import { useId, useState } from "react";
import type { AdminFetcher } from "@/lib/api/admin";
import type { AdminSectionItem } from "@/lib/api/types";
import { SECTION_SCHEMAS } from "@/sections/schemas";
import type { SectionType } from "@/sections/types";
import { FieldEditor } from "./FieldEditor";
import { btnPrimary, btnSecondary } from "./ui";

/**
 * Editor de uma seção, inteiramente guiado pelo schema do tipo
 * (SECTION_SCHEMAS): nenhum formulário é específico de um tipo de seção.
 */
export function SectionEditor({
  section,
  adminFetch,
  onSave,
  onCancel,
  saving,
}: {
  section: AdminSectionItem;
  adminFetch: AdminFetcher;
  onSave: (content: Record<string, unknown>) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const idPrefix = useId();
  const schema = SECTION_SCHEMAS[section.sectionType as SectionType];
  const [content, setContent] = useState<Record<string, unknown>>(() => ({
    ...schema?.defaultContent,
    ...section.content,
  }));

  if (!schema) {
    return (
      <p className="text-muted">
        Este tipo de seção ({section.sectionType}) ainda não tem editor.
      </p>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSave(content);
      }}
      className="flex flex-col gap-4"
    >
      <p className="text-sm text-subtle">{schema.description}</p>
      {schema.fields.map((field) => (
        <FieldEditor
          key={field.key}
          field={field}
          value={content[field.key]}
          onChange={(value) => setContent((prev) => ({ ...prev, [field.key]: value }))}
          adminFetch={adminFetch}
          idPrefix={idPrefix}
        />
      ))}
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className={btnPrimary}>
          {saving ? "Salvando…" : "Salvar seção"}
        </button>
        <button type="button" onClick={onCancel} className={btnSecondary}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
