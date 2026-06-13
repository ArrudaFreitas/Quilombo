'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  isTheme,
  type Theme,
} from '@/lib/theme'

type ThemeContextValue = {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

/** Lê o tema já aplicado no <html> pelo script anti-flash (sem flash/mismatch). */
function readAppliedTheme(): Theme {
  if (typeof document === 'undefined') return DEFAULT_THEME
  const attr = document.documentElement.getAttribute('data-theme')
  return isTheme(attr) ? attr : DEFAULT_THEME
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme)
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    /* storage indisponível: tema ainda funciona na sessão atual */
  }
}

/**
 * Provider de tema do produto. Não causa flash: o estado inicial é lido do
 * atributo que o script já aplicou. Expõe `useTheme()` para futuros controles
 * de UI (ex.: botão de alternância no header).
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readAppliedTheme)

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    applyTheme(next)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark'
      applyTheme(next)
      return next
    })
  }, [])

  // Sem escolha explícita do usuário, acompanha a preferência do sistema.
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (event: MediaQueryListEvent) => {
      let saved: string | null = null
      try {
        saved = localStorage.getItem(THEME_STORAGE_KEY)
      } catch {
        /* ignore */
      }
      if (!isTheme(saved)) {
        const system: Theme = event.matches ? 'dark' : 'light'
        setThemeState(system)
        document.documentElement.setAttribute('data-theme', system)
      }
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme]
  )

  return <ThemeContext value={value}>{children}</ThemeContext>
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme deve ser usado dentro de <ThemeProvider>')
  }
  return context
}
