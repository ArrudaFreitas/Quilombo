# Quilombo — Frontend

Next.js (App Router) + TypeScript + Tailwind CSS v4. Interface pública e painel
admin da plataforma, servida pelo nginx no mesmo origin da API (`/api/v1`),
com tenant resolvido por subdomínio (`<slug>.quilombo.localhost`).

## Scripts

| Comando             | O que faz                                  |
|---------------------|--------------------------------------------|
| `npm run dev`       | Dev server (porta 3000)                    |
| `npm run lint`      | ESLint (inclui jsx-a11y recommended)       |
| `npm run typecheck` | `tsc --noEmit`                             |
| `npm run test`      | Vitest (Testing Library + axe)             |
| `npm run build`     | Build de produção                          |

O alvo do CI é `lint + typecheck + test + build` — rode antes de commitar.

Em dev, suba a stack na raiz do repositório (`docker compose up`) e acesse
`https://quilombo.localhost:8080` (raiz) ou
`https://kalunga.quilombo.localhost:8080` (tenant). O nginx roteia `/api`,
`/oauth2` e `/login/oauth2` para o backend e o resto para este app.

## Arquitetura de estilização — conteúdo desacoplado de estilo e cor

Requisito central do projeto: **trocar estilo ou paleta nunca altera nem quebra
o conteúdo**. A solução são 3 camadas de CSS custom properties, da mais geral
para a mais específica (`src/styles/`):

```
:root            tokens.css      neutros + estrutura padrão (contrato completo)
[data-palette]   palettes.css    SÓ cor de marca (verde, terracota, ocre, indigo)
[data-style]     themes/*.css    SÓ estrutura visual (uniao, raizes)
```

Aplicação: um wrapper recebe os atributos vindos da API e tudo dentro dele
reage — sem re-render, sem lógica nos componentes:

```tsx
<div data-style={page.style} data-palette={page.palette}>
  {renderSections(sections)}
</div>
```

Regras do contrato (vale como checklist de review):

1. **Componentes consomem apenas tokens semânticos** — utilitários Tailwind
   mapeados em `globals.css` (`bg-primary`, `text-muted`, `rounded-theme`,
   `shadow-theme`, `font-display`…). Nunca cor/raio/sombra literal.
2. **Paleta define só os tokens de marca** (`--q-primary`, `--q-secondary`,
   `--q-accent` e seus pares "on-"). Nunca estrutura, nunca markup.
3. **Estilo define só estrutura** (raio, sombra, skins de seção escopadas em
   `[data-style="…"]`). Nunca cor de marca, nunca `display: none` em conteúdo.
4. **Markup é único e semântico** — não existe variante de componente por
   tema. Se um estilo "precisa" de outro markup, é skin CSS, não fork.

Resultado: Kalunga pode sair de `uniao/verde` para `raizes/terracota` e voltar;
o conteúdo permanece byte a byte o mesmo.

## Seções da página institucional

A página é composta por seções (`page_sections` no backend, `content` JSONB).
O frontend trata isso com um **registry** (`src/sections/registry.tsx`):

- **Adicionar um tipo de seção novo** = 3 passos no mesmo diretório:
  1. shape do conteúdo em `src/sections/types.ts` (+ `SectionContentMap`);
  2. componente em `src/sections/` (markup semântico, só tokens — use
     `Hero.tsx` como referência do padrão);
  3. uma linha no mapa `SECTION_COMPONENTS` do registry.
- **Alterar um campo** = ajustar o tipo em `types.ts` e o componente; campos
  opcionais ausentes não renderizam (nunca quebram).
- **Robustez**: tipo desconhecido é pulado; seção cujo render falhe (conteúdo
  malformado) é isolada por error boundary e some sozinha — o resto da página
  continua de pé.

## Acessibilidade — WCAG 2.1 AA

Baseline já garantido pelo setup:

- `lang="pt-BR"` (3.1.1) e fonte de corpo Atkinson Hyperlegible (legibilidade);
- skip link global + convenção `<main id="conteudo">` em toda página (2.4.1);
- indicador de foco visível, fixo e independente de paleta (2.4.7), via
  `:focus-visible` em `globals.css`;
- `prefers-reduced-motion` respeitado globalmente;
- tipografia 100% em `rem` — nada de `font-size` em px (1.4.4, zoom 200%);
- contraste AA verificado nos pares de tokens (1.4.3/1.4.11) — obrigatório
  re-verificar ao criar paleta nova;
- lint `jsx-a11y` (recommended, como erro) + teste axe no CI;
- `alt_text` é obrigatório no acervo (backend) e os componentes sempre o usam
  (1.1.1).

Checklist por tela nova:

- [ ] funciona nos 3 breakpoints: base (celular), `md` (tablet), `lg` (notebook);
- [ ] reflow ok a 320px de largura / zoom 200%, sem scroll horizontal (1.4.10);
- [ ] navegável só por teclado, ordem de foco lógica (2.1.1, 2.4.3);
- [ ] headings hierárquicos e landmarks corretos (1.3.1, 2.4.6);
- [ ] formulários com label visível, erro descritivo em texto (3.3.1, 3.3.2);
- [ ] estados/mensagens dinâmicas anunciados (`aria-live`) (4.1.3);
- [ ] nada comunicado só por cor (1.4.1); imagens com alt adequado (1.1.1).

## Consumo da API

`src/lib/api/` — cliente tipado do envelope `{ data, meta }` e erros
RFC 7807 (`ApiError`):

- browser: chamadas relativas (`/api/v1/...`), same-origin via nginx — cookies
  de refresh e tenant funcionam sem CORS;
- server (Server Components): `API_INTERNAL_URL` (default `http://backend:8080`)
  passando `tenantHost` para o backend resolver o tenant pelo Host;
- `src/lib/tenant.ts` espelha a regra de subdomínio do backend (com testes).

Variáveis de ambiente: `NEXT_PUBLIC_BASE_DOMAIN` (default `quilombo.localhost`)
e `API_INTERNAL_URL` (só server-side).
