package com.quilombo.page.dto;

import jakarta.validation.constraints.NotBlank;

public record StyleUpdateRequest(
        @NotBlank String style,
        @NotBlank String palette) {}
