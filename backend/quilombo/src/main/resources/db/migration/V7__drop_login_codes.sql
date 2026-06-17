-- V7: remove a tabela de códigos de login de uso único.
--
-- O login deixou de usar o redirect server-side do Google (que devolvia um código
-- opaco trocado por JWT) e passou a verificar diretamente o idToken do Google
-- Identity Services em POST /api/v1/auth/google. Sem o código intermediário, a
-- tabela auth_login_codes (criada na V2) não tem mais uso. O GRANT da role de
-- runtime sobre ela cai junto com o DROP.

DROP TABLE IF EXISTS auth_login_codes;
