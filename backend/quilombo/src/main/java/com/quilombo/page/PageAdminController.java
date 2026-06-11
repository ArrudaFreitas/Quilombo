package com.quilombo.page;

import com.quilombo.common.api.ApiResponse;
import com.quilombo.page.dto.AdminPageResponse;
import com.quilombo.page.dto.StyleOption;
import com.quilombo.page.dto.StyleUpdateRequest;
import com.quilombo.security.JwtPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Administração da página institucional ({@code /api/v1/admin}): catálogo de
 * estilos, configuração completa (com seções inativas) e troca de estilo/paleta.
 * Bearer do tenant exigido em todas, com allowlist revalidada no banco.
 */
@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
public class PageAdminController {

    private final PageAdminService pageService;

    @GetMapping("/styles")
    public ApiResponse<Map<String, StyleOption>> styles(
            @AuthenticationPrincipal JwtPrincipal principal) {
        return ApiResponse.ok(pageService.styles(principal));
    }

    @GetMapping("/page")
    public ApiResponse<AdminPageResponse> page(
            @AuthenticationPrincipal JwtPrincipal principal) {
        return ApiResponse.ok(pageService.page(principal));
    }

    @PutMapping("/page/style")
    public ApiResponse<AdminPageResponse> updateStyle(
            @AuthenticationPrincipal JwtPrincipal principal,
            @Valid @RequestBody StyleUpdateRequest request) {
        return ApiResponse.ok(pageService.updateStyle(principal, request));
    }
}
