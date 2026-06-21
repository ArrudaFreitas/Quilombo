/**
 * Catálogo de estilos e paletas das páginas institucionais — porte fiel do
 * `config/pageStyles.js` do MVP. Fonte de verdade no frontend; deve espelhar o
 * backend (`PageStyle`/`SectionType`). As quatro paletas valem para os dois
 * estilos; muda só a aparência visual.
 */

export interface PageStyleOption {
  id: string
  label: string
  description: string
  /** cor representativa para o swatch no seletor */
  previewColor: string
  previewBg: string
  palettes: string[]
}

export interface PaletteOption {
  id: string
  label: string
  color: string
  colorDark: string
}

export const STYLES: Record<string, PageStyleOption> = {
  uniao: {
    id: 'uniao',
    label: 'União & Comunidade',
    description:
      'Quente, arredondado e comunal. Arcos, sombras suaves, grão de papel e cor de verdade.',
    previewColor: '#A1572F',
    previewBg: '#F3EBD6',
    palettes: ['verde', 'terracota', 'ocre', 'indigo'],
  },
  raizes: {
    id: 'raizes',
    label: 'Raízes',
    description:
      'Geométrico e estruturado. Inspirado em Rubem Valentim — sombra dura, grade rígida, caixa-alta.',
    previewColor: '#2E6B4B',
    previewBg: '#F4EEE0',
    palettes: ['verde', 'terracota', 'ocre', 'indigo'],
  },
}

export const PALETTES: Record<string, PaletteOption> = {
  verde: {
    id: 'verde',
    label: 'Verde território',
    color: '#2E6B4B',
    colorDark: '#6FBE93',
  },
  terracota: {
    id: 'terracota',
    label: 'Terracota fogo',
    color: '#A1572F',
    colorDark: '#E29A6A',
  },
  ocre: {
    id: 'ocre',
    label: 'Ocre sol',
    color: '#8A6A18',
    colorDark: '#E6BE5E',
  },
  indigo: {
    id: 'indigo',
    label: 'Índigo noite',
    color: '#2C4A7C',
    colorDark: '#88B2E4',
  },
}

/** Paletas disponíveis para um dado estilo (todas, na prática — espelha o MVP). */
export function getPalettesForStyle(styleId: string): PaletteOption[] {
  const style = STYLES[styleId]
  if (!style) return []
  return style.palettes.map((id) => PALETTES[id]).filter(Boolean)
}

/** Default para comunidades sem configuração (igual ao backend). */
export const DEFAULT_STYLE = 'uniao'
export const DEFAULT_PALETTE = 'verde'
