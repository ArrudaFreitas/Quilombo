package com.quilombo.page.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.Map;

/**
 * Criação de seção: o tipo é validado contra o catálogo no serviço; o
 * {@code content} é livre por tipo e {@code null} vira documento vazio.
 */
public record SectionCreateRequest(
        @NotBlank String sectionType,
        Map<String, Object> content) {}
