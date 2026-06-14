package com.quilombo.auth.dto;

import jakarta.validation.constraints.NotBlank;

/** Corpo de POST /api/v1/auth/google: o idToken obtido no front via Google Identity Services. */
public record GoogleLoginRequest(@NotBlank String idToken) {}
