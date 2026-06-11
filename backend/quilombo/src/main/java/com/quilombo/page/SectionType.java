package com.quilombo.page;

import java.util.Arrays;
import java.util.Optional;

/**
 * Catálogo dos tipos de seção que a página institucional aceita. Fonte de verdade
 * do backend — deve estar em sincronia com os editores de seção do frontend e com
 * o {@code VALID_SECTION_TYPES} do MVP. O conteúdo de cada tipo é livre (JSONB);
 * aqui só validamos que o tipo pertence ao catálogo.
 */
public enum SectionType {

    HERO("hero"),
    DESCRIPTION_SHORT("description_short"),
    DESCRIPTION_LONG("description_long"),
    CAROUSEL("carousel"),
    EVENTS("events"),
    TIMELINE("timeline"),
    LOCATION("location");

    private final String id;

    SectionType(String id) {
        this.id = id;
    }

    public String id() {
        return id;
    }

    public static Optional<SectionType> fromId(String id) {
        return Arrays.stream(values())
                .filter(type -> type.id.equals(id))
                .findFirst();
    }
}
