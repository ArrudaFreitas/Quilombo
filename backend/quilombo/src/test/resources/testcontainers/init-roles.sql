-- Provisionamento da role de RUNTIME para os testes (Testcontainers), rodado
-- antes do Flyway via withInitScript, como o superusuário do container.
-- O superusuário 'test' é o dono/migrador (Flyway); a aplicação conecta como
-- 'quilombo_app' (não-dona) para o RLS valer de verdade nos testes.
CREATE ROLE quilombo_app WITH LOGIN PASSWORD 'quilombo_app';
GRANT CONNECT ON DATABASE test TO quilombo_app;
GRANT USAGE ON SCHEMA public TO quilombo_app;
