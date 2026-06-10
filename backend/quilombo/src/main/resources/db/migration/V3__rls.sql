-- =====================================================================
-- V3 — Row-Level Security (RLS): 2ª camada de isolamento multi-tenant.
--
-- Roda como o DONO do schema (datasource de migração do Flyway). A role de
-- RUNTIME 'quilombo_app' (não-dona, sem privilégio de furar o RLS) é
-- provisionada FORA do Flyway: docker-entrypoint-initdb.d em dev,
-- withInitScript no Testcontainers, ops em produção.
--
-- A política filtra pela GUC 'app.current_tenant', gravada por sessão pelo
-- TenantConnectionProvider (Hibernate). Tenant ausente -> NULL -> nenhuma
-- linha casa (fail-closed). WITH CHECK impede gravar linha de outro tenant.
-- =====================================================================

-- Guarda: a role de runtime precisa existir antes desta migração.
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'quilombo_app') THEN
        RAISE EXCEPTION
            'Role quilombo_app não existe. Provisione-a antes da migração '
            '(dev: docker compose down -v && up; prod: ops).';
    END IF;
END $$;

-- ----- Grants para a role de aplicação -----
-- Tabelas tenant-scoped (com community_id) — protegidas por RLS abaixo.
GRANT SELECT, INSERT, UPDATE, DELETE ON
    community_profiles, admins, institutional_pages, page_sections, storage_usage
    TO quilombo_app;

-- Tabelas NÃO tenant-scoped que o runtime acessa (sem RLS de tenant):
--   communities      — raiz do tenant; a resolução pública por slug acontece
--                      antes de haver tenant no contexto.
--   community_cards  — diretório público desnormalizado (leitura cross-tenant
--                      intencional).
--   auth_login_codes — infra de auth, anterior à resolução do tenant.
GRANT SELECT, INSERT, UPDATE, DELETE ON
    communities, community_cards, auth_login_codes
    TO quilombo_app;

-- Sequences dos BIGSERIAL — sem USAGE o INSERT do runtime falha no nextval.
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO quilombo_app;

-- Tabelas/sequences futuras criadas pelo dono herdam os grants automaticamente.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO quilombo_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO quilombo_app;

-- ----- RLS + política por tabela tenant-scoped -----
-- NULLIF protege contra GUC vazia; cast falho não ocorre pois o runtime grava
-- sempre um bigint (sentinela 0 quando não há tenant — não casa com ninguém).

ALTER TABLE community_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON community_profiles FOR ALL TO quilombo_app
    USING      (community_id = NULLIF(current_setting('app.current_tenant', true), '')::bigint)
    WITH CHECK (community_id = NULLIF(current_setting('app.current_tenant', true), '')::bigint);

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON admins FOR ALL TO quilombo_app
    USING      (community_id = NULLIF(current_setting('app.current_tenant', true), '')::bigint)
    WITH CHECK (community_id = NULLIF(current_setting('app.current_tenant', true), '')::bigint);

ALTER TABLE institutional_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON institutional_pages FOR ALL TO quilombo_app
    USING      (community_id = NULLIF(current_setting('app.current_tenant', true), '')::bigint)
    WITH CHECK (community_id = NULLIF(current_setting('app.current_tenant', true), '')::bigint);

ALTER TABLE page_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON page_sections FOR ALL TO quilombo_app
    USING      (community_id = NULLIF(current_setting('app.current_tenant', true), '')::bigint)
    WITH CHECK (community_id = NULLIF(current_setting('app.current_tenant', true), '')::bigint);

ALTER TABLE storage_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON storage_usage FOR ALL TO quilombo_app
    USING      (community_id = NULLIF(current_setting('app.current_tenant', true), '')::bigint)
    WITH CHECK (community_id = NULLIF(current_setting('app.current_tenant', true), '')::bigint);
