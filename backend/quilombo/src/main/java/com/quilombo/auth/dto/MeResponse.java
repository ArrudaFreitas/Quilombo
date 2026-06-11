package com.quilombo.auth.dto;

/** Sessão atual do admin — id (sem PII), nome (claim do JWT) e slug da comunidade. */
public record MeResponse(Long id, String name, String communitySlug) {}
