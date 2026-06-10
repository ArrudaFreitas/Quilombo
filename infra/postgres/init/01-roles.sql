-- Provisionamento da role de RUNTIME da aplicação, executado pelo Postgres
-- apenas na 1ª subida do container (docker-entrypoint-initdb.d), como
-- superusuário. 'quilombo_app' NÃO é dona das tabelas, então o RLS vale para
-- ela. O Flyway/migração conecta como o usuário dono (POSTGRES_USER).
--
-- Senha de DEV (descartável). Em produção, a role é provisionada por ops com
-- segredo gerenciado — nunca commitada.
CREATE ROLE quilombo_app WITH LOGIN PASSWORD 'quilombo_app';
GRANT CONNECT ON DATABASE quilombo TO quilombo_app;
GRANT USAGE ON SCHEMA public TO quilombo_app;
