package com.quilombo.community;

import com.quilombo.common.api.ApiResponse;
import com.quilombo.community.dto.CardResponse;
import com.quilombo.community.dto.CardUpdateRequest;
import com.quilombo.security.JwtPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Administração do card da comunidade ({@code /api/v1/admin/card}) — primeira
 * rota autenticada da área admin: exige Bearer válido do tenant do subdomínio,
 * com a allowlist revalidada no banco a cada requisição.
 */
@RestController
@RequestMapping("/admin/card")
@RequiredArgsConstructor
public class CardAdminController {

    private final CardAdminService cardService;

    @GetMapping
    public ApiResponse<CardResponse> get(@AuthenticationPrincipal JwtPrincipal principal) {
        return ApiResponse.ok(cardService.get(principal));
    }

    @PutMapping
    public ApiResponse<CardResponse> update(
            @AuthenticationPrincipal JwtPrincipal principal,
            @Valid @RequestBody CardUpdateRequest request) {
        return ApiResponse.ok(cardService.update(principal, request));
    }
}
