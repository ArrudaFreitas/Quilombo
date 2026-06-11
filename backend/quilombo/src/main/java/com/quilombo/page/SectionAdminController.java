package com.quilombo.page;

import com.quilombo.common.api.ApiResponse;
import com.quilombo.page.dto.AdminPageResponse;
import com.quilombo.page.dto.SectionContentRequest;
import com.quilombo.page.dto.SectionCreateRequest;
import com.quilombo.page.dto.SectionReorderRequest;
import com.quilombo.security.JwtPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * CRUD das seções da página institucional ({@code /api/v1/admin/sections}):
 * criar (com tipo e limite validados), editar conteúdo, reordenar em lote,
 * alternar visibilidade e remover. Bearer do tenant exigido em todas, com a
 * allowlist revalidada no banco. Toda rota devolve a página completa atualizada.
 */
@RestController
@RequestMapping("/admin/sections")
@RequiredArgsConstructor
public class SectionAdminController {

    private final PageAdminService pageService;

    @PostMapping
    public ApiResponse<AdminPageResponse> create(
            @AuthenticationPrincipal JwtPrincipal principal,
            @Valid @RequestBody SectionCreateRequest request) {
        return ApiResponse.ok(pageService.createSection(principal, request));
    }

    @PutMapping("/reorder")
    public ApiResponse<AdminPageResponse> reorder(
            @AuthenticationPrincipal JwtPrincipal principal,
            @Valid @RequestBody SectionReorderRequest request) {
        return ApiResponse.ok(pageService.reorderSections(principal, request));
    }

    @PutMapping("/{id}")
    public ApiResponse<AdminPageResponse> updateContent(
            @AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable Long id,
            @Valid @RequestBody SectionContentRequest request) {
        return ApiResponse.ok(pageService.updateSectionContent(principal, id, request));
    }

    @PatchMapping("/{id}/toggle")
    public ApiResponse<AdminPageResponse> toggle(
            @AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable Long id) {
        return ApiResponse.ok(pageService.toggleSection(principal, id));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<AdminPageResponse> delete(
            @AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable Long id) {
        return ApiResponse.ok(pageService.deleteSection(principal, id));
    }
}
