-- Texto alternativo da imagem do card, desnormalizado junto da URL — pela mesma razão de
-- image_url/short_description: o diretório público lê community_cards cross-tenant e não pode
-- resolver o alt no storage_usage (tenant-scoped, RLS V3). É um snapshot no momento do save,
-- sincronizado a partir de community_profiles, exatamente como os demais campos do card.
ALTER TABLE community_profiles ADD COLUMN image_alt_text VARCHAR(500);
ALTER TABLE community_cards    ADD COLUMN image_alt_text VARCHAR(500);
