"use client";

import { useEffect, useRef, useState } from "react";
import { getImages, uploadImage, type AdminFetcher } from "@/lib/api/admin";
import type { AdminImage } from "@/lib/api/types";
import type { ImageRef } from "@/sections/types";
import { Feedback, PanelLoading, btnPrimary, btnSecondary, errorMessage, inputClass } from "./ui";

/**
 * Seletor de imagem do acervo, com upload embutido. <dialog> nativo:
 * showModal() dá foco preso, ESC e fundo inerte de graça (WCAG 2.1.2).
 */
export function ImagePickerDialog({
  adminFetch,
  open,
  onClose,
  onSelect,
}: {
  adminFetch: AdminFetcher;
  open: boolean;
  onClose: () => void;
  onSelect: (image: ImageRef) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [images, setImages] = useState<AdminImage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [altText, setAltText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      setImages(null);
      setError(null);
      getImages(adminFetch)
        .then(({ data }) => setImages(data))
        .catch((err) => setError(errorMessage(err)));
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, adminFetch]);

  async function handleUpload(event: React.FormEvent) {
    event.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Escolha um arquivo de imagem.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const { data } = await uploadImage(adminFetch, file, altText.trim());
      onSelect({ url: data.url, alt_text: data.altText });
      setAltText("");
      if (fileRef.current) fileRef.current.value = "";
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-label="Escolher imagem do acervo"
      className="m-auto w-[min(90vw,48rem)] rounded-theme bg-surface p-0 shadow-theme backdrop:bg-foreground/50"
    >
      <div className="flex max-h-[80vh] flex-col gap-4 overflow-y-auto p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-2xl text-foreground">Escolher imagem</h2>
          <button type="button" onClick={onClose} className={btnSecondary}>
            Fechar
          </button>
        </div>

        <Feedback kind="error">{error}</Feedback>

        <form
          onSubmit={handleUpload}
          className="flex flex-col gap-3 rounded-theme-sm border border-border bg-surface-raised p-4"
        >
          <p className="font-bold text-foreground">Enviar imagem nova</p>
          <div className="flex flex-col gap-1">
            <label htmlFor="picker-file" className="text-sm font-bold text-foreground">
              Arquivo (até 5 MB)
            </label>
            <input
              id="picker-file"
              ref={fileRef}
              type="file"
              accept="image/*"
              className="text-sm text-muted"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="picker-alt" className="text-sm font-bold text-foreground">
              Descrição da imagem (texto alternativo)
            </label>
            <input
              id="picker-alt"
              type="text"
              value={altText}
              onChange={(event) => setAltText(event.target.value)}
              placeholder="Ex.: Mulheres dançando a Sussa ao entardecer"
              className={inputClass}
              maxLength={200}
            />
            <p className="text-xs text-subtle">
              Obrigatória — é o que leitores de tela anunciam no lugar da imagem.
            </p>
          </div>
          <button type="submit" disabled={uploading} className={`${btnPrimary} self-start`}>
            {uploading ? "Enviando…" : "Enviar e usar"}
          </button>
        </form>

        <p className="font-bold text-foreground">Ou escolha do acervo</p>
        {images === null && !error && <PanelLoading />}
        {images && images.length === 0 && (
          <p className="text-muted">O acervo ainda está vazio.</p>
        )}
        {images && images.length > 0 && (
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {images.map((image) => (
              <li key={image.filename}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect({ url: image.url, alt_text: image.altText });
                    onClose();
                  }}
                  className="flex w-full flex-col gap-1 rounded-theme-sm border border-border bg-surface-raised p-2 text-left hover:border-primary"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.url}
                    alt={image.altText}
                    loading="lazy"
                    className="aspect-[4/3] w-full rounded-theme-sm object-cover"
                  />
                  <span className="line-clamp-2 text-xs text-muted">
                    {image.altText}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </dialog>
  );
}
