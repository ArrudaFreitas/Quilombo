package com.quilombo.auth;

import com.quilombo.auth.dto.GoogleLoginRequest;
import com.quilombo.auth.dto.MeResponse;
import com.quilombo.auth.dto.TokenResponse;
import com.quilombo.common.api.ApiResponse;
import com.quilombo.security.JwtPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoints de autenticação. Prefixo global /api/v1 aplicado em {@code WebConfig}.
 *
 * <p>O access token (JWT curto) trafega no corpo; o refresh token (opaco, longo)
 * trafega apenas no cookie httpOnly de {@link AuthCookies} — o JavaScript nunca o vê.
 */
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final AuthCookies authCookies;

    /** Troca o idToken do Google (obtido no front via GIS) pelo par de tokens da sessão. */
    @PostMapping("/google")
    public ResponseEntity<ApiResponse<TokenResponse>> loginWithGoogle(
            @Valid @RequestBody GoogleLoginRequest request) {
        var tokens = authService.loginWithGoogle(request.idToken());
        return withRefreshCookie(tokens);
    }

    /** Rotaciona a sessão longa: consome o refresh do cookie e emite outro par. */
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<TokenResponse>> refresh(
            @CookieValue(value = AuthCookies.REFRESH_COOKIE, required = false) String refreshToken) {
        var tokens = authService.refresh(refreshToken);
        return withRefreshCookie(tokens);
    }

    /** Revoga a sessão longa e expira o cookie — idempotente. */
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            @CookieValue(value = AuthCookies.REFRESH_COOKIE, required = false) String refreshToken) {
        authService.logout(refreshToken);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, authCookies.expiredRefreshCookie().toString())
                .body(ApiResponse.ok(null));
    }

    /**
     * Sessão atual: valida o Bearer (assinatura/expiração no filtro, allowlist no
     * banco) e devolve quem está logado. {@code principal} nulo cobre o profile dev
     * (permitAll deixa a requisição chegar sem autenticação) — 401 igual ao prod.
     */
    @GetMapping("/me")
    public ApiResponse<MeResponse> me(@AuthenticationPrincipal JwtPrincipal principal) {
        if (principal == null) {
            throw new InvalidSessionException();
        }
        return ApiResponse.ok(authService.me(principal));
    }

    private ResponseEntity<ApiResponse<TokenResponse>> withRefreshCookie(TokenPair tokens) {
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE,
                        authCookies.refreshCookie(tokens.refreshToken()).toString())
                .body(ApiResponse.ok(new TokenResponse(tokens.accessToken())));
    }
}
