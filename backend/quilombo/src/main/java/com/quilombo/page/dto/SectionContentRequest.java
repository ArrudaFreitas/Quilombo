package com.quilombo.page.dto;

import jakarta.validation.constraints.NotNull;

import java.util.Map;

/** Edição do conteúdo de uma seção; substitui o documento JSON inteiro. */
public record SectionContentRequest(
        @NotNull Map<String, Object> content) {}
