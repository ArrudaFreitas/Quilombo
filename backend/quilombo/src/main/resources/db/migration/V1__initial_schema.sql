-- V1: Schema inicial traduzido do MVP Python/SQLite para PostgreSQL

CREATE TABLE communities (
    id         BIGSERIAL PRIMARY KEY,
    slug       VARCHAR(100) UNIQUE NOT NULL,
    name       VARCHAR(255) NOT NULL,
    location   VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabela desnormalizada para listagem pública (leitura cross-tenant segura).
-- Escrita somente via community_profiles, que sincroniza este card.
CREATE TABLE community_cards (
    id                BIGSERIAL PRIMARY KEY,
    community_slug    VARCHAR(100) UNIQUE NOT NULL,
    name              VARCHAR(255) NOT NULL,
    location          VARCHAR(255) NOT NULL,
    image_url         VARCHAR(500),
    short_description TEXT
);

-- Dados editáveis do card, scoped por community_id.
CREATE TABLE community_profiles (
    id                BIGSERIAL PRIMARY KEY,
    community_id      BIGINT UNIQUE NOT NULL REFERENCES communities(id),
    image_url         VARCHAR(500),
    short_description TEXT,
    updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- E-mails de admins autorizados por comunidade (armazenados com BCrypt)
CREATE TABLE admins (
    id           BIGSERIAL PRIMARY KEY,
    community_id BIGINT NOT NULL REFERENCES communities(id),
    email_hash   VARCHAR(255) NOT NULL,
    email_plain  VARCHAR(255) NOT NULL,
    UNIQUE (community_id, email_plain)
);

CREATE TABLE institutional_pages (
    id           BIGSERIAL PRIMARY KEY,
    community_id BIGINT UNIQUE NOT NULL REFERENCES communities(id),
    style        VARCHAR(50) NOT NULL DEFAULT 'uniao',
    palette      VARCHAR(50) NOT NULL DEFAULT 'verde'
);

-- content armazenado como JSONB — pesquisável e validado pelo PostgreSQL
CREATE TABLE page_sections (
    id           BIGSERIAL PRIMARY KEY,
    community_id BIGINT NOT NULL REFERENCES communities(id),
    section_type VARCHAR(50) NOT NULL,
    order_index  INTEGER NOT NULL,
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    content      JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE storage_usage (
    id           BIGSERIAL PRIMARY KEY,
    community_id BIGINT NOT NULL REFERENCES communities(id),
    filename     VARCHAR(255) NOT NULL,
    size_bytes   BIGINT NOT NULL,
    alt_text     TEXT NOT NULL DEFAULT '',
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices para queries frequentes
CREATE INDEX idx_page_sections_community ON page_sections(community_id, order_index);
CREATE INDEX idx_storage_usage_community ON storage_usage(community_id);
CREATE INDEX idx_admins_community        ON admins(community_id);
