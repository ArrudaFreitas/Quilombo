# Quilombo

Plataforma **multi-tenant** para comunidades quilombolas — cada comunidade é resolvida por subdomínio (`<comunidade>.quilombo.localhost`) e administra sua própria página institucional, seções de conteúdo e acervo de imagens.

> **Status:** backend com as features do MVP implementadas; frontend (Next.js) em construção — fundação de temas, seções e consumo da API pronta.

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
│   │   ├── auth/          # troca de código de login por JWT
│   │   ├── community/     # tenant root (Community) e perfil público
│   │   ├── config/        # configurações (Security, JPA, OpenAPI, MapStruct…)
│   │   ├── security/      # JWT e OAuth2
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
| Frontend — diretório público | `https://quilombo.localhost:8080` |
| Frontend — página de uma comunidade | `https://kalunga.quilombo.localhost:8080` |
| API (mesmo origin, via nginx) | `https://quilombo.localhost:8080/api/v1/…` |
| Swagger UI | `https://quilombo.localhost:8080/swagger-ui.html` |
| Health check | `https://quilombo.localhost:8080/actuator/health` |
| Console do MinIO | `http://localhost:9001` (usuário/senha: `quilombo` / `quilombo123`) |

> O nginx roteia `/api`, `/oauth2`, `/login/oauth2`, `/actuator` e o Swagger para o backend; todo o resto vai para o frontend — mesmo origin, sem CORS, preservando o `Host` que resolve o tenant.

> O certificado TLS é auto-assinado e gerado no primeiro start. O navegador exibirá um aviso — confie nele localmente importando `infra/nginx/certs/quilombo.crt` como CA raiz, se quiser eliminar o aviso.
>
> Subdomínios `*.quilombo.localhost` resolvem para `127.0.0.1` na maioria dos sistemas. Se algum não resolver, adicione-o ao seu `/etc/hosts`.

### Opção 2 — Maven local

Requer um PostgreSQL acessível (por padrão `jdbc:postgresql://localhost:5432/quilombo_dev`):

```bash
cd backend/quilombo
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

### Seed de desenvolvimento

No profile `dev`, a aplicação semeia na subida (idempotente) as comunidades do MVP — `kalunga`, `palmares` e `frechal`. Para testar o **login com Google** no navegador, exporte seu e-mail antes de subir; o seed o registra como admin das três comunidades (apenas o HMAC do e-mail é persistido):

```bash
export DEV_ADMIN_EMAIL=seu-email@gmail.com
export GOOGLE_CLIENT_ID=...      # credenciais OAuth do Google Cloud Console
export GOOGLE_CLIENT_SECRET=...
docker-compose up --build
```

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
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Credenciais do OAuth2 Google | homolog/prod |
| `HOMOLOG_USER` / `HOMOLOG_PASSWORD` | Credenciais do Basic Auth do homolog | homolog |
| `APP_BASE_DOMAIN` | Domínio base usado para CORS e redirects | sim |

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
