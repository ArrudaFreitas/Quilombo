# Arquitetura de estilos — Quilombo (produto)

Fundação visual do **produto** (diretório/listagem, login, administração).
A identidade **institucional das comunidades** é um sistema separado e isolado —
aqui existe apenas a sua _preparação arquitetural_ (`institutional/scaffold.css`).

> Objetivo: páginas e componentes futuros **consomem** estas bases e nunca
> redefinem cor, tamanho, fonte, espaçamento, estado, sombra, foco ou regra
> responsiva.

## Camadas (ordem de import em `globals.css`)

| Arquivo | Responsabilidade | Regra |
|---|---|---|
| `tokens/primitives.css` | Valores crus (ramps de cor, etc.) | **Único lugar com hex.** Não consumir na UI. |
| `tokens/semantic.css` | Papéis do tema **claro** (`--bg`, `--fg`, `--primary`…) | Só `var()` de primitivos. |
| `tokens/dark.css` | Override dos papéis no tema **escuro** | Só `var()` de primitivos. |
| `base.css` | Reset + tipografia base + foco/a11y global | `@layer base`. Sem valores mágicos. |
| `components.css` | Abstrações base (`.btn`, `.field`, `.surface`…) + `@utility` | `@layer components`. Só tokens. |
| `institutional/scaffold.css` | Isolamento dos temas de comunidade | Escopado em `.institutional`. Sem temas ainda. |
| `globals.css` | Entrypoint: `@import`s + `@theme` + `@custom-variant` | Importado 1× no root layout. |

## Tokens → Tailwind

`globals.css` conecta os tokens semânticos ao Tailwind v4:

- **Reset da paleta** (`@theme { --color-*: initial }`): cores arbitrárias
  (`bg-red-500`) deixam de existir. Só tokens valem → consistência automática.
- **`@theme inline`**: gera utilitários que **referenciam** a variável, então o
  valor troca com o tema sem trocar classe:
  `bg-bg`, `bg-surface`, `text-fg`, `text-fg-muted`, `text-primary`,
  `border-border`, `shadow-sm|md|lg`, etc.
- **Estáticos** (`@theme`): `font-display` / `font-body` / `font-sans`,
  `rounded-sm|md|lg|xl`, `ease-fluid`.
- **Espaçamento e breakpoints**: usamos a escala padrão do Tailwind (base 4px) —
  `md:` = tablet (768px), `lg:` = notebook (1024px), `xl:` = 1280px.
  Contêiner de página: utilitário `container-page` (máx. 75rem + gutter fluido).

## Theming (claro/escuro)

- Ativado por `data-theme` no `<html>`.
- `@custom-variant dark (&:where([data-theme='dark'], …))` substitui o
  comportamento padrão do `dark:` (que usaria `prefers-color-scheme`).
- **Anti-flash**: `lib/theme.ts` → `themeInitScript()` é renderizado no `<head>`
  por `components/theme-script.tsx` **com nonce** (exigência do CSP). Roda antes
  do paint, aplica o tema salvo/do sistema, evita flash e hydration mismatch.
- **Runtime**: `components/theme-provider.tsx` expõe `useTheme()` para futuros
  controles de UI. O estado inicial é lido do atributo já aplicado pelo script.

## Acessibilidade (WCAG 2.1 AA) embutida na base

- Foco visível global por token (`--focus`), alto contraste, `:focus-visible`.
- Corpo em Atkinson Hyperlegible; base 16px; `clamp()` para escala fluida.
- `prefers-reduced-motion` desliga animações/transições.
- Zoom ≥ 200% preservado (sem travar `viewport`).
- Pares de texto com alvo de contraste documentados em `semantic.css`
  (`--fg-subtle` é só para texto grande/UI).

## Barreira produto ⇄ institucional

Dois sistemas, **isolados por escopo de seletor**:

- **Produto**: tokens em `:root` / `[data-theme]`.
- **Institucional** (futuro): tokens `--ip-*` escopados em
  `.institutional[data-style][data-palette]`. Nunca lê tokens do produto, e o
  produto nunca lê `--ip-*`. Combinações são finitas → CSS estático por `data-*`,
  **sem `style` inline** (compatível com o CSP `style-src 'self' 'nonce-…'`).

## Convenções

- **Consumir**: utilitários Tailwind (tokens) para layout/estado/responsivo;
  classes-abstração (`.btn`, `.field`…) para os primitivos visuais.
- **Proibido**: hex fora de `primitives.css`; `style` inline; cor/raio/sombra
  "na mão". Garantido por `stylelint` (`color-no-hex`) + CSP + paleta resetada.
- **Ordem de classes**: `prettier-plugin-tailwindcss` (automático).
- **Verificar**: `npm run lint` · `npm run lint:css` · `npm run typecheck`.
