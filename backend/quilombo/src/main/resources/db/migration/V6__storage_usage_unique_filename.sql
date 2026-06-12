-- V6: filename como identificador externo do objeto.
--
-- O acervo de imagens usa o filename (único por incluir o slug da comunidade)
-- como path param em editar-alt e deletar, e como chave no object storage. A
-- restrição garante que cada filename seja único dentro da comunidade — torna o
-- lookup por (community_id, filename) determinístico e documenta o invariante.

ALTER TABLE storage_usage
    ADD CONSTRAINT uq_storage_usage_filename UNIQUE (community_id, filename);
