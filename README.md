# Quilombo

Plataforma **multi-tenant** para comunidades quilombolas — cada comunidade é resolvida por subdomínio (`<comunidade>.quilombo.ianarruda.dev`) e administra sua própria página institucional, seções de conteúdo e acervo de imagens.

> **Status:** funcional de ponta a ponta. Backend com multi-tenancy (subdomínio + RLS), autenticação (OAuth2 Google + JWT com refresh rotacionado), diretório público, página institucional e área administrativa completa (card, estilo/paleta, seções, acervo de imagens). Frontend Next.js com as três telas — diretório, página institucional tematizável e painel admin — conectadas à API (ver `frontend/README.md`).

---

## Stack

| Camada | Tecnologia |
|---|---|
| Linguagem | Java 21 |
| Framework | Spring Boot 4.0.6 (Web MVC, Validation) |
| Banco | PostgreSQL 17 + Flyway (migrations) |
| Segurança | Spring Security — JWT (JJWT) + OAuth2 Login (Google) |
| Mapeamento | MapStruct + Lombok |
| Documentação da API | springdoc-openapi (Swagger UI) |
| Observabilidade | Spring Actuator + Micrometer/Prometheus |
| Object storage (dev) | MinIO (S3-compatível) |
| Reverse proxy | nginx (TLS, preserva `Host` para resolver o tenant) |
| Testes | JUnit 5 + Testcontainers (PostgreSQL real) |
| Frontend | Next.js (App Router) + TypeScript + Tailwind CSS v4 |
| Testes (frontend) | Vitest + Testing Library + axe (acessibilidade) |

## Estrutura do repositório

```
.
├── backend/quilombo/      # aplicação Spring Boot
│   ├── src/main/java/com/quilombo/
│   │   ├── auth/          # login por código/OAuth2 → JWT + refresh rotacionado
│   │   ├── community/     # tenant root (Community), perfil público e card admin
│   │   ├── page/          # página institucional: estilo/paleta e CRUD de seções
│   │   ├── media/         # acervo de imagens: upload (resize + WebP), quota, alt
│   │   ├── storage/       # abstração de object storage S3 (MinIO em dev)
│   │   ├── common/        # envelope ApiResponse e tratamento de erros (ProblemDetail)
│   │   ├── config/        # configurações (Security, JPA, OpenAPI, MapStruct…)
│   │   ├── security/      # JWT e OAuth2
│   │   ├── seed/          # seed idempotente das comunidades de dev
│   │   └── tenant/        # multi-tenancy: @TenantId + RLS (subdomínio → tenant)
│   ├── src/main/resources/
│   │   ├── db/migration/  # migrations Flyway (V1__…)
│   │   └── application*.yml
│   └── Dockerfile
├── frontend/              # app Next.js (ver frontend/README.md — temas, seções, a11y)
│   └── src/
│       ├── app/           # rotas (App Router)
│       ├── lib/           # cliente da API ({data, meta}/ProblemDetail) e tenancy
│       ├── sections/      # registry e componentes das seções da página
│       └── styles/        # tokens semânticos, paletas e estilos (data-*)
├── infra/nginx/           # reverse proxy TLS para dev
├── infra/postgres/init/   # provisiona a role de runtime (RLS) na 1ª subida
└── docker-compose.yml     # postgres, minio, backend, frontend, nginx
```

---

## Como rodar

### Opção 1 — Docker Compose (recomendado)

Sobe todo o ambiente de desenvolvimento (PostgreSQL, MinIO, backend no profile `dev` e nginx com TLS):

```bash
docker-compose up --build
```

Serviços expostos:

| Serviço | URL |
|---|---|
| Frontend — diretório público | `https://quilombo.ianarruda.dev:8080` |
| Frontend — página de uma comunidade | `https://kalunga.quilombo.ianarruda.dev:8080` |
| API (mesmo origin, via nginx) | `https://quilombo.ianarruda.dev:8080/api/v1/…` |
| Swagger UI | `https://quilombo.ianarruda.dev:8080/swagger-ui.html` |
| Health check | `https://quilombo.ianarruda.dev:8080/actuator/health` |
| Console do MinIO | `http://localhost:9001` (usuário/senha: `quilombo` / `quilombo123`) |

> O nginx roteia `/api`, `/actuator` e o Swagger para o backend; todo o resto vai para o frontend — mesmo origin, sem CORS, preservando o `Host` que resolve o tenant.

> **TLS (mkcert) e `/etc/hosts` são pré-requisitos.** `quilombo.ianarruda.dev` é um domínio `.dev` (HSTS-preloaded): o navegador exige um certificado **confiável** (auto-assinado é bloqueado) e o domínio real só resolve em produção. Antes de subir, gere o cert com mkcert e mapeie o domínio para `127.0.0.1` — passo a passo em [`infra/nginx/README.md`](infra/nginx/README.md):
>
> ```bash
> mkcert -install && ./infra/nginx/generate-dev-certs.sh   # cert confiável (uma vez)
> # adicione ao /etc/hosts (e os slugs que for testar):
> 127.0.0.1  quilombo.ianarruda.dev kalunga.quilombo.ianarruda.dev palmares.quilombo.ianarruda.dev frechal.quilombo.ianarruda.dev
> ```

### Opção 2 — Maven local

Requer um PostgreSQL acessível (por padrão `jdbc:postgresql://localhost:5432/quilombo_dev`):

```bash
cd backend/quilombo
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

### Seed e login de desenvolvimento

No profile `dev`, a aplicação semeia na subida (idempotente) as comunidades do MVP — `kalunga`, `palmares` e `frechal`. As variáveis de dev ficam num `.env` na raiz, carregado automaticamente pelo Docker Compose:

```bash
cp .env.example .env          # já vem com o client-id de dev compartilhado
# edite .env e aponte DEV_ADMIN_EMAIL para a SUA conta Google
# (o seed a registra como admin das três comunidades — só o HMAC do e-mail é persistido)
docker-compose up --build
```

**O client-id do Google não é segredo e pode ser compartilhado:** o login verifica o idToken apenas com as chaves **públicas** do Google — não há *client secret*. As **Authorized JavaScript origins** do domínio de dev (`https://quilombo.ianarruda.dev:8080` e os subdomínios das comunidades) já estão registradas nesse client-id, e o domínio resolve em qualquer máquina via `/etc/hosts` (**não é preciso possuí-lo**). Ou seja: um contribuidor **não precisa criar nada no Google** — bastam o `.env.example`, o `/etc/hosts` e o mkcert.

> **Passo manual único no Console do Google (uma vez, pelo mantenedor):** publique a tela de consentimento OAuth — os escopos `openid`/`email`/`profile` são **não-sensíveis** (sem revisão do Google). Publicada, qualquer conta Google loga e nenhum contribuidor precisa ser adicionado como *test user*. Para isolar, cada dev pode criar o próprio client OAuth e sobrescrever `GOOGLE_CLIENT_ID`/`NEXT_PUBLIC_GOOGLE_CLIENT_ID` no `.env`. Detalhes das origens em [`infra/nginx/README.md`](infra/nginx/README.md).

---

## Profiles

| Profile | Uso | Segurança |
|---|---|---|
| `dev` | Desenvolvimento local | Acesso liberado, Swagger e Actuator abertos |
| `homolog` | Homologação | HTTP Basic Auth bloqueia o ambiente |
| `prod` | Produção | OAuth2 Login (Google) + JWT, Actuator mínimo |

O profile é definido por `SPRING_PROFILES_ACTIVE`.

## Variáveis de ambiente

Copie `backend/quilombo/.env.example` e preencha conforme o ambiente. **Nunca** versione arquivos `.env.*` com valores reais.

| Variável | Descrição | Obrigatória |
|---|---|---|
| `SPRING_PROFILES_ACTIVE` | `dev` \| `homolog` \| `prod` | sim |
| `SERVER_PORT` | Porta do servidor (padrão `8080`) | não |
| `DATABASE_URL` | JDBC URL do PostgreSQL | homolog/prod |
| `DB_USERNAME` / `DB_PASSWORD` | Credenciais do banco | homolog/prod |
| `JWT_SECRET` | Segredo HMAC-SHA256 (mín. 32 caracteres) | homolog/prod |
| `JWT_EXPIRATION_HOURS` | Validade do token (padrão `24`) | não |
| `GOOGLE_CLIENT_ID` | Client-id do OAuth Google (audiência do idToken; sem secret) | homolog/prod |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Mesmo client-id, exposto ao front (botão GIS) | homolog/prod |
| `HOMOLOG_USER` / `HOMOLOG_PASSWORD` | Credenciais do Basic Auth do homolog | homolog |
| `APP_BASE_DOMAIN` | Domínio base usado para CORS | sim |

> Em `dev` há fallbacks seguros para todas as variáveis — não é necessário configurar nada para subir via Docker Compose.

---

## Testes

Os testes de integração usam Testcontainers e **exigem Docker em execução**:

```bash
cd backend/quilombo
./mvnw test
```

Para acelerar o ciclo local reutilizando containers entre execuções, copie `.testcontainers.properties.example` para `~/.testcontainers.properties`.

## Banco de dados e migrations

O schema é gerenciado pelo **Flyway** (`src/main/resources/db/migration`). O Hibernate roda com `ddl-auto: validate` — ele nunca altera o schema, apenas valida contra as migrations. Toda mudança de schema entra como uma nova migration `V<n>__descricao.sql`.

---

## Contribuindo

O fluxo de branches, o padrão de commits e o processo de PR estão descritos em [CONTRIBUTING.md](CONTRIBUTING.md).

## Licença

Distribuído sob a **GNU General Public License v3.0**. Veja [LICENSE](LICENSE) para o texto completo.

Copyright (C) 2026 Projeto Quilombo
