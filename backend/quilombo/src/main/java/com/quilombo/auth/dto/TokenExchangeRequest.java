package com.quilombo.auth.dto;

import jakarta.validation.constraints.NotBlank;

/** Corpo de POST /api/v1/auth/token. */
public record TokenExchangeRequest(@NotBlank String code) {}
