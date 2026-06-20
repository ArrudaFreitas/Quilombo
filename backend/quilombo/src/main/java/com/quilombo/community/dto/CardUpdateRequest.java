package com.quilombo.community.dto;

import jakarta.validation.constraints.Size;

/** Campos editáveis do card; {@code null} limpa o campo, como no MVP. */
public record CardUpdateRequest(
        @Size(max = 500) String imageUrl,
        @Size(max = 500) String imageAltText,
        @Size(max = 500) String shortDescription) {}
