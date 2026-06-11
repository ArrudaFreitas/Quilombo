-- V5: refresh tokens opacos com rotação.
--
-- O access token (JWT) encurta e a sessão longa vive aqui: token opaco de
-- 32 bytes entregue em cookie httpOnly, persistido apenas como hash SHA-256.
-- Cada uso consome a linha e emite outra (rotação); reuso de token antigo
-- falha. Tenant-scoped: o refresh acontece no subdomínio da comunidade, e a
-- política de RLS isola as sessões por tenant como nas demais tabelas.
-- ON DELETE CASCADE: remover o admin (ou a comunidade) revoga as sessões.

CREATE TABLE refresh_tokens (
    id           BIGSERIAL PRIMARY KEY,
    token_hash   VARCHAR(64) UNIQUE NOT NULL,          -- SHA-256 hex do token
    admin_id     BIGINT NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    community_id BIGINT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    name         VARCHAR(255) NOT NULL DEFAULT '',     -- claim "name" re-cunhado na rotação
    expires_at   TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- usado na limpeza oportunista de tokens expirados
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- Grants de tabela/sequence herdados do ALTER DEFAULT PRIVILEGES (V3);
-- a política de RLS é por tabela e precisa ser criada aqui.
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON refresh_tokens FOR ALL TO quilombo_app
    USING      (community_id = NULLIF(current_setting('app.current_tenant', true), '')::bigint)
    WITH CHECK (community_id = NULLIF(current_setting('app.current_tenant', true), '')::bigint);
