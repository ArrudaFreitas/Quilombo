package com.quilombo.page;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

/**
 * Catálogo de estilos da página institucional. Fonte de verdade do backend —
 * deve estar em sincronia com o config de estilos do frontend (pageStyles).
 * As quatro paletas valem para todos os estilos, como no MVP.
 */
public enum PageStyle {

    UNIAO("uniao", "União & Comunidade"),
    RAIZES("raizes", "Raízes");

    public static final List<String> PALETTES = List.of("verde", "terracota", "ocre", "indigo");

    private final String id;
    private final String label;

    PageStyle(String id, String label) {
        this.id = id;
        this.label = label;
    }

    public String id() {
        return id;
    }

    public String label() {
        return label;
    }

    public List<String> palettes() {
        return PALETTES;
    }

    public static Optional<PageStyle> fromId(String id) {
        return Arrays.stream(values())
                .filter(style -> style.id.equals(id))
                .findFirst();
    }
}
