package com.quilombo.auth.dto;

/** JWT emitido na troca do código. O frontend o usa como Bearer. */
public record TokenResponse(String token) {}
