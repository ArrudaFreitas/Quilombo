-- V2: códigos de troca de uso único para o login OAuth.
-- O callback do OAuth não devolve o JWT na URL; devolve um código opaco e curto,
-- que o frontend troca por um JWT via POST. Guardamos apenas o HASH do código.

CREATE TABLE auth_login_codes (
    id         BIGSERIAL PRIMARY KEY,
    code_hash  VARCHAR(64) UNIQUE NOT NULL,        -- SHA-256 hex do código
    subject    VARCHAR(255) NOT NULL,              -- subject do JWT (e-mail)
    name       VARCHAR(255) NOT NULL DEFAULT '',   -- claim "name"
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- usado na limpeza oportunista de códigos expirados
CREATE INDEX idx_auth_login_codes_expires_at ON auth_login_codes(expires_at);
