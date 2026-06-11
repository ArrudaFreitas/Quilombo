-- V4: allowlist de admins sem e-mail cru (LGPD).
--
-- O V1 previa BCrypt e guardava email_plain. BCrypt não serve para lookup
-- (salt aleatório => hash não-determinístico) e e-mail cru não pode ser
-- persistido. O identificador passa a ser HMAC-SHA256 (hex, 64 chars) do
-- e-mail normalizado, com segredo do servidor (EMAIL_HASH_SECRET) — busca
-- determinística por igualdade, sem rainbow table sem o segredo.

ALTER TABLE admins DROP COLUMN email_plain;
ALTER TABLE admins ALTER COLUMN email_hash TYPE VARCHAR(64);
ALTER TABLE admins ADD CONSTRAINT uq_admins_community_email_hash
    UNIQUE (community_id, email_hash);

-- O código de login também deixa de carregar o e-mail cru: no callback do
-- OAuth o backend grava direto o HMAC; a troca casa esse hash com admins.
ALTER TABLE auth_login_codes RENAME COLUMN subject TO email_hash;
ALTER TABLE auth_login_codes ALTER COLUMN email_hash TYPE VARCHAR(64);
