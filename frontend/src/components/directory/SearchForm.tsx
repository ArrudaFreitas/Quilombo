"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Busca do diretório. Progressive enhancement: é um <form method="get"> que
 * funciona sem JavaScript; com JS, debounce de 300ms atualiza a URL e o
 * Server Component refaz a listagem. Label visível (WCAG 3.3.2).
 */
export function SearchForm({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interacted = useRef(false);

  useEffect(() => {
    if (!interacted.current) {
      return;
    }
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams();
      if (value.trim()) params.set("name", value.trim());
      router.replace(params.size > 0 ? `/?${params}` : "/", { scroll: false });
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, router]);

  return (
    <form method="get" action="/" role="search" className="flex max-w-xl flex-col gap-2">
      <label htmlFor="busca-comunidade" className="font-bold text-foreground">
        Buscar comunidade
      </label>
      <div className="flex gap-2">
        <input
          id="busca-comunidade"
          type="search"
          name="name"
          value={value}
          onChange={(event) => {
            interacted.current = true;
            setValue(event.target.value);
          }}
          placeholder="Ex.: Kalunga"
          className="w-full rounded-theme-sm border border-border bg-surface-raised px-4 py-3 text-foreground placeholder:text-subtle"
        />
        <button
          type="submit"
          className="shrink-0 rounded-theme-sm bg-primary px-5 py-3 font-bold text-on-primary hover:bg-primary-strong"
        >
          Buscar
        </button>
      </div>
    </form>
  );
}
