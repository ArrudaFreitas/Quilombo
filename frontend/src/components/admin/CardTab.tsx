"use client";

import { useEffect, useState } from "react";
import { getCard, updateCard, type AdminFetcher } from "@/lib/api/admin";
import type { AdminCard } from "@/lib/api/types";
import { ImagePickerDialog } from "./ImagePickerDialog";
import {
  Feedback,
  PanelLoading,
  btnPrimary,
  btnSecondary,
  errorMessage,
  inputClass,
} from "./ui";

const DESCRIPTION_MAX = 200;

/**
 * Aba "Comunidade": edita o card exibido no diretório público (imagem de capa
 * e descrição curta), com pré-visualização ao vivo. Nome e localização são
 * fixos — vêm do cadastro da comunidade.
 */
export function CardTab({ adminFetch }: { adminFetch: AdminFetcher }) {
  const [card, setCard] = useState<AdminCard | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    getCard(adminFetch)
      .then(({ data }) => {
        setCard(data);
        setImageUrl(data.imageUrl);
        setDescription(data.shortDescription ?? "");
      })
      .catch((error) => setFeedback({ kind: "error", text: errorMessage(error) }));
  }, [adminFetch]);

  if (!card) {
    return (
      <>
        {feedback && <Feedback kind={feedback.kind}>{feedback.text}</Feedback>}
        {!feedback && <PanelLoading />}
      </>
    );
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const { data } = await updateCard(adminFetch, {
        imageUrl,
        shortDescription: description.trim() || null,
      });
      setCard(data);
      setFeedback({ kind: "success", text: "Card salvo com sucesso." });
    } catch (error) {
      setFeedback({ kind: "error", text: errorMessage(error) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <form onSubmit={save} className="flex flex-col gap-5">
        <h2 className="text-2xl text-foreground">Card no diretório</h2>
        {feedback && <Feedback kind={feedback.kind}>{feedback.text}</Feedback>}

        <fieldset className="flex flex-col gap-3 rounded-theme-sm border border-border p-4">
          <legend className="px-1 text-sm font-bold text-foreground">
            Informações fixas
          </legend>
          <p className="text-foreground">
            <span className="font-bold">Nome:</span> {card.name}
          </p>
          <p className="text-foreground">
            <span className="font-bold">Localização:</span> {card.location}
          </p>
          <p className="text-xs text-subtle">
            Definidas no cadastro da comunidade; não editáveis por aqui.
          </p>
        </fieldset>

        <div className="flex flex-col gap-2">
          <p className="font-bold text-foreground">Imagem de capa</p>
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt="Imagem de capa atual do card"
              className="aspect-[3/2] w-full max-w-sm rounded-theme-sm object-cover"
            />
          ) : (
            <p className="text-sm text-subtle">Nenhuma imagem escolhida.</p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className={btnSecondary}
            >
              {imageUrl ? "Trocar imagem" : "Escolher imagem"}
            </button>
            {imageUrl && (
              <button
                type="button"
                onClick={() => setImageUrl(null)}
                className={btnSecondary}
              >
                Remover imagem
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="card-descricao" className="font-bold text-foreground">
            Descrição curta
          </label>
          <textarea
            id="card-descricao"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={DESCRIPTION_MAX}
            rows={3}
            placeholder="Ex.: Maior comunidade quilombola do Brasil, na Chapada dos Veadeiros."
            className={inputClass}
          />
          <p className="text-xs text-subtle">
            {description.length}/{DESCRIPTION_MAX} caracteres
          </p>
        </div>

        <button type="submit" disabled={saving} className={`${btnPrimary} self-start`}>
          {saving ? "Salvando…" : "Salvar alterações"}
        </button>
      </form>

      <section aria-label="Pré-visualização do card" className="flex flex-col gap-3">
        <h2 className="text-2xl text-foreground">Pré-visualização</h2>
        <p className="text-sm text-subtle">
          É assim que o card aparece no diretório público.
        </p>
        <div className="max-w-sm overflow-hidden rounded-theme bg-surface-raised shadow-theme-sm">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt=""
              className="aspect-[3/2] w-full object-cover"
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex aspect-[3/2] w-full items-center justify-center bg-secondary"
            >
              <span className="font-display text-5xl text-primary">
                {card.name.charAt(0)}
              </span>
            </div>
          )}
          <div className="flex flex-col gap-1 p-4">
            <p className="font-display text-xl font-bold text-foreground">
              {card.name}
            </p>
            <p className="text-sm text-subtle">{card.location}</p>
            {description.trim() && (
              <p className="mt-1 text-sm text-muted">{description.trim()}</p>
            )}
          </div>
        </div>
      </section>

      <ImagePickerDialog
        adminFetch={adminFetch}
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(image) => setImageUrl(image.url)}
      />
    </div>
  );
}
