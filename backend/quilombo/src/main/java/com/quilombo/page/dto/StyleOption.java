package com.quilombo.page.dto;

import com.quilombo.page.PageStyle;

import java.util.List;

/** Entrada do catálogo de estilos exposto ao admin. */
public record StyleOption(String label, List<String> palettes) {

    public static StyleOption from(PageStyle style) {
        return new StyleOption(style.label(), style.palettes());
    }
}
