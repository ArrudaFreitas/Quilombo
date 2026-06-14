package com.quilombo.auth;

import com.quilombo.config.AppProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * Cookies httpOnly de sessão (invisíveis ao JavaScript — XSS não rouba a sessão),
 * restritos às rotas de auth. Dois níveis:
 *
 * <ul>
 *   <li><b>refresh</b> — host-only e <b>por-tenant</b>: a sessão rotacionada (RLS) de
 *       um subdomínio específico;
 *   <li><b>identity</b> — no <b>domínio-pai</b> ({@code Domain=.baseDomain}), compartilhado
 *       por todos os subdomínios: a identidade verificada pelo Google. Faz o bootstrap da
 *       sessão por-tenant em qualquer comunidade onde o e-mail esteja na allowlist, sem novo
 *       login — é o que permite **uma única origem** registrada no Google.
 * </ul>
 */
@Component
@RequiredArgsConstructor
public class AuthCookies {

    public static final String REFRESH_COOKIE = "quilombo_refresh";
    public static final String IDENTITY_COOKIE = "quilombo_identity";

    private final AppProperties appProperties;

    /** Cookie do refresh por-tenant, emitido no login e renovado a cada rotação. */
    public ResponseCookie refreshCookie(String rawRefreshToken) {
        return builder(rawRefreshToken)
                .maxAge(Duration.ofDays(appProperties.auth().refreshExpirationDays()))
                .build();
    }

    /** Cookie expirado — remove a sessão por-tenant do navegador no logout. */
    public ResponseCookie expiredRefreshCookie() {
        return builder("").maxAge(Duration.ZERO).build();
    }

    /** Cookie de identidade (domínio-pai), emitido na verificação do idToken. */
    public ResponseCookie identityCookie(String identityToken) {
        return identityBuilder(identityToken)
                .maxAge(Duration.ofDays(appProperties.auth().refreshExpirationDays()))
                .build();
    }

    /** Cookie de identidade expirado — derruba a sessão em todos os subdomínios. */
    public ResponseCookie expiredIdentityCookie() {
        return identityBuilder("").maxAge(Duration.ZERO).build();
    }

    private ResponseCookie.ResponseCookieBuilder builder(String value) {
        return ResponseCookie.from(REFRESH_COOKIE, value)
                .httpOnly(true)
                .secure(appProperties.auth().cookieSecure())
                .sameSite("Strict")
                // só as rotas de auth recebem o cookie — o resto da API usa Bearer
                .path("/api/v1/auth");
    }

    private ResponseCookie.ResponseCookieBuilder identityBuilder(String value) {
        return ResponseCookie.from(IDENTITY_COOKIE, value)
                .httpOnly(true)
                .secure(appProperties.auth().cookieSecure())
                // Lax sobrevive ao redirect ápice→subdomínio; Domain no pai compartilha
                // o cookie com todos os *.baseDomain (e o próprio baseDomain).
                .sameSite("Lax")
                .domain(appProperties.baseDomain())
                .path("/api/v1/auth");
    }
}
