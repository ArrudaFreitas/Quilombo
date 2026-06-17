package com.quilombo.auth;

/**
 * Valida o {@code idToken} do Google (credencial do Google Identity Services) e extrai a
 * identidade verificada. É uma interface para permitir mock nos testes — o build/CI não
 * depende do Google real.
 */
public interface GoogleTokenVerifier {

    GoogleUser verify(String idToken);

    /** Identidade verificada do Google: {@code sub} é o id estável; {@code name} é exibição. */
    record GoogleUser(String email, String sub, String name) {}
}
