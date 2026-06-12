package com.quilombo.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/** Corpo de POST /api/v1/auth/dev-login (apenas profile dev). */
public record DevLoginRequest(
        @NotBlank @Email String email,
        String name) {}
