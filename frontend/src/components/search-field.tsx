'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'

/**
 * Busca por nome. Atualiza a URL (?q=) com debounce — a página é re-renderizada
 * no servidor a partir da URL, então a busca é compartilhável e funciona com o
 * histórico. `replace` (não `push`) evita poluir o histórico a cada tecla.
 * `useTransition` expõe o estado de carregamento sem travar o input.
 */
export function SearchField({ defaultValue = '' }: { defaultValue?: string }) {
  const router = useRouter()
  const [value, setValue] = useState(defaultValue)
  const [isPending, startTransition] = useTransition()
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function navigate(next: string) {
    const trimmed = next.trim()
    const href = trimmed ? `/?q=${encodeURIComponent(trimmed)}` : '/'
    startTransition(() => router.replace(href, { scroll: false }))
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const next = event.target.value
    setValue(next)
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => navigate(next), next ? 300 : 0)
  }

  function handleClear() {
    setValue('')
    if (debounce.current) clearTimeout(debounce.current)
    navigate('')
    inputRef.current?.focus()
  }

  return (
    <form role="search" onSubmit={(event) => event.preventDefault()} className="relative">
      <label htmlFor="community-search" className="sr-only">
        Buscar comunidade por nome
      </label>

      <svg
        className="text-fg-subtle pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>

      <input
        id="community-search"
        ref={inputRef}
        type="search"
        value={value}
        onChange={handleChange}
        placeholder="Buscar por nome…"
        autoComplete="off"
        className="field-input w-full pr-11 pl-11 [&::-webkit-search-cancel-button]:hidden"
      />

      <span className="absolute top-1/2 right-3 -translate-y-1/2">
        {isPending ? (
          <span
            className="border-fg-subtle block size-4 animate-spin rounded-full border-2 border-t-transparent"
            role="status"
            aria-label="Buscando"
          />
        ) : value ? (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Limpar busca"
            className="text-fg-subtle hover:text-primary flex size-7 items-center justify-center rounded-full text-xl leading-none"
          >
            ×
          </button>
        ) : null}
      </span>
    </form>
  )
}
