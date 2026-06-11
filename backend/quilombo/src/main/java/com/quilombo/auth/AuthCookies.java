package com.quilombo.auth;

import com.quilombo.config.AppProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * Cookie httpOnly do refresh token: invisível ao JavaScript (XSS não rouba a
 * sessão longa), restrito às rotas de auth e host-only — cada subdomínio tem a
 * própria sessão, coerente com o modelo por-tenant.
 */
@Component
@RequiredArgsConstructor
public class AuthCookies {

    public static final String REFRESH_COOKIE = "quilombo_refresh";

    private final AppProperties appProperties;

    /** Cookie do refresh emitido no login e renovado a cada rotação. */
    public ResponseCookie refreshCookie(String rawRefreshToken) {
        return builder(rawRefreshToken)
                .maxAge(Duration.ofDays(appProperties.auth().refreshExpirationDays()))
                .build();
    }

    /** Cookie expirado — remove a sessão longa do navegador no logout. */
    public ResponseCookie expiredRefreshCookie() {
        return builder("").maxAge(Duration.ZERO).build();
    }

    private ResponseCookie.ResponseCookieBuilder builder(String value) {
        return ResponseCookie.from(REFRESH_COOKIE, value)
                .httpOnly(true)
                .secure(appProperties.auth().cookieSecure())
                .sameSite("Strict")
                // só as rotas de auth recebem o cookie — o resto da API usa Bearer
                .path("/api/v1/auth");
    }
}
