package com.quilombo.auth;

import com.quilombo.auth.dto.MeResponse;
import com.quilombo.auth.dto.TokenExchangeRequest;
import com.quilombo.auth.dto.TokenResponse;
import com.quilombo.common.api.ApiResponse;
import com.quilombo.security.JwtPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Endpoints de autenticação. Prefixo global /api/v1 aplicado em {@code WebConfig}. */
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /** Troca o código de uso único (recebido no callback do OAuth) por um JWT. */
    @PostMapping("/token")
    public ApiResponse<TokenResponse> exchangeToken(@Valid @RequestBody TokenExchangeRequest request) {
        var token = authService.exchangeCodeForToken(request.code());
        return ApiResponse.ok(new TokenResponse(token));
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
}
