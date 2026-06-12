"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  deleteImage,
  getImages,
  getStorageUsage,
  updateAltText,
  uploadImage,
  type AdminFetcher,
} from "@/lib/api/admin";
import type { AdminImage, StorageUsage } from "@/lib/api/types";
import {
  Feedback,
  PanelLoading,
  btnDanger,
  btnPrimary,
  btnSecondary,
  errorMessage,
  inputClass,
} from "./ui";

/**
 * Aba "Imagens": acervo da comunidade — upload (alt obrigatório), quota de
 * armazenamento, edição de texto alternativo e exclusão (bloqueada em uso).
 */
export function ImagesTab({ adminFetch }: { adminFetch: AdminFetcher }) {
  const [images, setImages] = useState<AdminImage[] | null>(null);
  const [usage, setUsage] = useState<StorageUsage | null>(null);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [altText, setAltText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const reload = useCallback(async () => {
    const [imagesRes, usageRes] = await Promise.all([
      getImages(adminFetch),
      getStorageUsage(adminFetch),
    ]);
    setImages(imagesRes.data);
    setUsage(usageRes.data);
  }, [adminFetch]);

  useEffect(() => {
    Promise.all([getImages(adminFetch), getStorageUsage(adminFetch)])
      .then(([imagesRes, usageRes]) => {
        setImages(imagesRes.data);
        setUsage(usageRes.data);
      })
      .catch((error) => setFeedback({ kind: "error", text: errorMessage(error) }));
  }, [adminFetch]);

  async function handleUpload(event: React.FormEvent) {
    event.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setFeedback({ kind: "error", text: "Escolha um arquivo de imagem." });
      return;
    }
    setUploading(true);
    setFeedback(null);
    try {
      await uploadImage(adminFetch, file, altText.trim());
      setAltText("");
      if (fileRef.current) fileRef.current.value = "";
      await reload();
      setFeedback({ kind: "success", text: "Imagem enviada para o acervo." });
    } catch (error) {
      setFeedback({ kind: "error", text: errorMessage(error) });
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(image: AdminImage) {
    if (!window.confirm(`Excluir a imagem "${image.altText}" do acervo?`)) {
      return;
    }
    setFeedback(null);
    try {
      await deleteImage(adminFetch, image.filename);
      await reload();
      setFeedback({ kind: "success", text: "Imagem excluída." });
    } catch (error) {
      setFeedback({ kind: "error", text: errorMessage(error) });
    }
  }

  async function handleAltSave(image: AdminImage, newAlt: string) {
    setFeedback(null);
    try {
      await updateAltText(adminFetch, image.filename, newAlt.trim());
      await reload();
      setFeedback({ kind: "success", text: "Descrição atualizada." });
    } catch (error) {
      setFeedback({ kind: "error", text: errorMessage(error) });
    }
  }

  if (images === null || usage === null) {
    return (
      <>
        {feedback && <Feedback kind={feedback.kind}>{feedback.text}</Feedback>}
        {!feedback && <PanelLoading />}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl text-foreground">Acervo de imagens</h2>
      {feedback && <Feedback kind={feedback.kind}>{feedback.text}</Feedback>}

      <StorageBar usage={usage} />

      <form
        onSubmit={handleUpload}
        className="flex flex-col gap-3 rounded-theme-sm border border-border bg-surface-raised p-4"
      >
        <p className="font-bold text-foreground">Enviar imagem</p>
        <div className="flex flex-col gap-1">
          <label htmlFor="acervo-file" className="text-sm font-bold text-foreground">
            Arquivo (até 5 MB — convertido para WebP)
          </label>
          <input
            id="acervo-file"
            ref={fileRef}
            type="file"
            accept="image/*"
            className="text-sm text-muted"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="acervo-alt" className="text-sm font-bold text-foreground">
            Descrição da imagem (texto alternativo)
          </label>
          <input
            id="acervo-alt"
            type="text"
            value={altText}
            onChange={(event) => setAltText(event.target.value)}
            placeholder="Ex.: Casa de farinha em mutirão"
            maxLength={200}
            className={inputClass}
          />
          <p className="text-xs text-subtle">
            Obrigatória — leitores de tela anunciam este texto no lugar da imagem.
          </p>
        </div>
        <button
          type="submit"
          disabled={uploading || usage.percent >= 100}
          className={`${btnPrimary} self-start`}
        >
          {uploading ? "Enviando…" : "Enviar para o acervo"}
        </button>
        {usage.percent >= 100 && (
          <p className="text-sm font-bold text-accent">
            Armazenamento cheio — exclua imagens para enviar novas.
          </p>
        )}
      </form>

      {images.length === 0 ? (
        <p className="text-muted">O acervo ainda está vazio.</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {images.map((image) => (
            <li key={image.filename}>
              <ImageCard
                image={image}
                onDelete={() => handleDelete(image)}
                onAltSave={(value) => handleAltSave(image, value)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Barra de uso da quota, com rótulo textual (nada só por cor — WCAG 1.4.1). */
function StorageBar({ usage }: { usage: StorageUsage }) {
  const percent = Math.min(usage.percent, 100);
  const warning = usage.percent >= 80;
  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm text-foreground">
        <span className="font-bold">Armazenamento:</span> {usage.usedMb} MB de{" "}
        {usage.limitMb} MB usados ({usage.percent}%)
        {warning && <span className="font-bold text-accent"> — quase cheio</span>}
      </p>
      <div
        role="progressbar"
        aria-label="Uso do armazenamento"
        aria-valuenow={Math.round(usage.percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-3 w-full max-w-md overflow-hidden rounded-theme-sm bg-background-subtle"
      >
        <div
          className={warning ? "h-full bg-accent" : "h-full bg-primary"}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function ImageCard({
  image,
  onDelete,
  onAltSave,
}: {
  image: AdminImage;
  onDelete: () => void;
  onAltSave: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(image.altText);

  return (
    <article className="flex h-full flex-col gap-2 rounded-theme-sm border border-border bg-surface-raised p-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.url}
        alt={image.altText}
        loading="lazy"
        className="aspect-[4/3] w-full rounded-theme-sm object-cover"
      />
      <div className="flex flex-wrap items-center gap-2 text-xs text-subtle">
        <span>{image.sizeKb} KB</span>
        <span aria-hidden="true">·</span>
        <time dateTime={image.createdAt}>
          {new Date(image.createdAt).toLocaleDateString("pt-BR")}
        </time>
        {image.inUse && (
          <span className="rounded-theme-sm bg-secondary px-2 py-0.5 font-bold text-foreground">
            Em uso
          </span>
        )}
      </div>

      {editing ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onAltSave(draft);
            setEditing(false);
          }}
          className="flex flex-col gap-2"
        >
          <label
            htmlFor={`alt-${image.filename}`}
            className="text-xs font-bold text-foreground"
          >
            Descrição da imagem
          </label>
          <input
            id={`alt-${image.filename}`}
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={200}
            className={inputClass}
          />
          <div className="flex gap-2">
            <button type="submit" className={btnSecondary}>
              Salvar
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(image.altText);
                setEditing(false);
              }}
              className={btnSecondary}
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <p className="flex-1 text-sm text-muted">{image.altText}</p>
      )}

      {!editing && (
        <div className="flex gap-2">
          <button type="button" onClick={() => setEditing(true)} className={btnSecondary}>
            Editar descrição
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={image.inUse}
            title={image.inUse ? "Remova a imagem das seções/card antes de excluir." : undefined}
            className={btnDanger}
          >
            Excluir
          </button>
        </div>
      )}
      {image.inUse && (
        <p className="text-xs text-subtle">
          Em uso na página ou no card — remova de lá para poder excluir.
        </p>
      )}
    </article>
  );
}
