package com.quilombo.auth;

import com.quilombo.auth.dto.DevLoginRequest;
import com.quilombo.auth.dto.DevLoginResponse;
import com.quilombo.common.api.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Login de desenvolvimento — substitui APENAS o passo do Google: emite o mesmo
 * código opaco de uso único do callback OAuth para o e-mail informado. Todo o
 * resto do fluxo é o real: a troca em {@code POST /auth/token} continua
 * exigindo que o e-mail esteja na allowlist de admins do tenant (403 caso
 * contrário), e o JWT + refresh cookie emitidos são idênticos aos de produção.
 *
 * <p>O bean só existe no profile {@code dev} — em homolog/prod a rota não
 * existe e cai na regra geral da security chain.
 */
@RestController
@Profile("dev")
@RequestMapping("/auth")
@RequiredArgsConstructor
public class DevAuthController {

    private final AuthService authService;

    @PostMapping("/dev-login")
    public ApiResponse<DevLoginResponse> devLogin(@Valid @RequestBody DevLoginRequest request) {
        var name = request.name() != null && !request.name().isBlank()
                ? request.name()
                : request.email().split("@")[0];
        return ApiResponse.ok(new DevLoginResponse(authService.issueLoginCode(request.email(), name)));
    }
}
