package com.quilombo.community;

import com.quilombo.common.api.ApiResponse;
import com.quilombo.community.dto.CommunityCardResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Listagem pública de comunidades ({@code GET /api/v1/communities}) — o diretório
 * que a home renderiza na raiz do domínio. Sem autenticação e sem tenant; liberado
 * explicitamente na security chain de prod.
 */
@RestController
@RequestMapping("/communities")
@RequiredArgsConstructor
public class CommunityDirectoryController {

    private final CommunityDirectoryService directoryService;

    @GetMapping
    public ApiResponse<List<CommunityCardResponse>> list(
            @RequestParam(required = false) String name,
            @PageableDefault(sort = "name") Pageable pageable) {
        return ApiResponse.of(directoryService.list(name, pageable));
    }
}
