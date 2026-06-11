package com.quilombo.auth;

/**
 * Par emitido no login e a cada rotação: o access (JWT curto) vai no corpo da
 * resposta; o refresh (opaco, longo) vai apenas no cookie httpOnly.
 */
public record TokenPair(String accessToken, String refreshToken) {}
