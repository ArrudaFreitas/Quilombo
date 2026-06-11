package com.quilombo.page;

import com.quilombo.common.api.ApiResponse;
import com.quilombo.page.dto.CommunityPageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Página institucional pública ({@code GET /api/v1/community}) — o conteúdo
 * completo que o front renderiza em {@code <slug>.quilombo...}. Sem autenticação;
 * o tenant vem do subdomínio. Liberado explicitamente na security chain de prod.
 */
@RestController
@RequestMapping("/community")
@RequiredArgsConstructor
public class CommunityPageController {

    private final CommunityPageService pageService;

    @GetMapping
    public ApiResponse<CommunityPageResponse> publicPage() {
        return ApiResponse.ok(pageService.publicPage());
    }
}
