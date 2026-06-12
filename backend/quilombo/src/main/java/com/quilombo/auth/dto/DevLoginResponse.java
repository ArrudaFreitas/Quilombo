package com.quilombo.auth.dto;

/** Código de login de uso único, trocável em POST /api/v1/auth/token. */
public record DevLoginResponse(String code) {}
