package com.quilombo.common.api;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;

/**
 * Metadados que acompanham toda resposta de sucesso. {@code page} só é serializado
 * em respostas paginadas (omitido quando nulo, independente da config global do Jackson).
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record Meta(Instant timestamp, PageMeta page) {}
