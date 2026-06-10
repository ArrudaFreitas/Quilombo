package com.quilombo.common.api;

import org.springframework.data.domain.Page;

import java.time.Instant;
import java.util.List;

/**
 * Envelope padrão das respostas de sucesso da API.
 *
 * <p>Respostas de sucesso usam {@code { "data": ..., "meta": ... }}; respostas de erro
 * NÃO usam este envelope — seguem RFC 7807 ({@link org.springframework.http.ProblemDetail}).
 *
 * <p>Aplicação explícita nos controllers via {@link #ok(Object)} e {@link #of(Page)}.
 */
public record ApiResponse<T>(T data, Meta meta) {

    /** Envelopa um recurso único. */
    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(data, new Meta(Instant.now(), null));
    }

    /**
     * Envelopa uma página: {@code content} vai para {@code data} e os metadados de
     * paginação para {@code meta.page}, reaproveitando os nomes de campo do PagedModel.
     */
    public static <T> ApiResponse<List<T>> of(Page<T> page) {
        var pageMeta = new PageMeta(
                page.getSize(),
                page.getNumber(),
                page.getTotalElements(),
                page.getTotalPages());
        return new ApiResponse<>(page.getContent(), new Meta(Instant.now(), pageMeta));
    }
}
