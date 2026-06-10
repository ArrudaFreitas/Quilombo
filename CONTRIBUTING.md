# Guia de contribuição

Este documento descreve o fluxo de trabalho, o padrão de commits e o processo de Pull Request do projeto Quilombo.

## Fluxo de branches

A branch de integração é a **`develop`**. A `main` recebe apenas releases estáveis.

> **Regra de ouro:** toda branch nova nasce a partir da `develop` atualizada — nunca de outra branch de feature.

O ciclo é:

```
1. git checkout develop
2. git pull origin develop          # atualiza a develop
3. git checkout -b <tipo>/<descricao>   # nova branch
4. implementar + commitar
5. git push -u origin <branch>
6. abrir Pull Request para develop
7. merge após revisão
8. repetir o ciclo a partir do passo 1
```

### Nomenclatura de branches

`<tipo>/<descricao-curta-em-kebab-case>`, usando os mesmos tipos do Conventional Commits:

```
feat/cadastro-comunidade
fix/validacao-slug
chore/base-config
docs/base-documentation
```

## Padrão de commits

Seguimos [**Conventional Commits**](https://www.conventionalcommits.org/):

```
<tipo>(<escopo>): <descrição no imperativo>
```

### Tipos

| Tipo | Quando usar |
|---|---|
| `feat` | Nova funcionalidade |
| `fix` | Correção de bug |
| `docs` | Documentação |
| `refactor` | Refatoração sem mudança de comportamento |
| `test` | Adição/ajuste de testes |
| `chore` | Build, configuração, tooling |
| `perf` | Melhoria de performance |
| `style` | Formatação (sem alterar lógica) |

### Escopos usados no projeto

`config`, `security`, `api`, `data`, `mapping`, `observability`, `test`, `build`, `infra`, `docs`.

### Boas práticas de commit

- Mensagens em **português**, no imperativo (ex.: "adicionar", "corrigir", "remover").
- Commits **atômicos**: uma mudança coesa por commit.
- Quando o *porquê* não for óbvio, explique-o na descrição (ex.: incompatibilidade de versão, decisão de arquitetura).

Exemplos:

```
feat(security): adicionar JwtService e JwtAuthenticationFilter
fix(config): corrigir chave spring duplicada no application.yml
chore(test): fixar versão do postgres no Testcontainers para 17-alpine
```

## Pull Requests

- PRs sempre têm a **`develop`** como base.
- Descreva o objetivo e o que entra no PR.
- Garanta que o build e os testes passam (`./mvnw verify`) antes de solicitar revisão.
- O merge é feito pelo mantenedor após a revisão.

## Estilo de código

O `.editorconfig` na raiz define indentação, charset e quebra de linha. Configure seu editor para respeitá-lo.
