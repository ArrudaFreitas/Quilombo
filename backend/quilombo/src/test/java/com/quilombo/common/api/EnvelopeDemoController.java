package com.quilombo.common.api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Controller exclusivo de teste, usado por {@link ApiResponseWebTest} para validar
 * o envelope, a paginação e o prefixo /api/v1 ponta a ponta. Não faz parte do código
 * de produção (fica em src/test).
 */
@RestController
@RequestMapping("/demo")
class EnvelopeDemoController {

    @GetMapping
    ApiResponse<DemoDto> single() {
        return ApiResponse.ok(new DemoDto("hello"));
    }

    @GetMapping("/page")
    ApiResponse<List<DemoDto>> page() {
        var page = new PageImpl<>(List.of(new DemoDto("a")), PageRequest.of(0, 20), 1);
        return ApiResponse.of(page);
    }

    @PostMapping
    ApiResponse<DemoDto> create(@Valid @RequestBody DemoRequest request) {
        return ApiResponse.ok(new DemoDto(request.slug()));
    }

    record DemoDto(String value) {}

    record DemoRequest(@NotBlank String slug) {}
}
