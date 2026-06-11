package com.quilombo.page.dto;

import jakarta.validation.constraints.NotEmpty;

import java.util.List;

/**
 * Reordenação em lote: a ordem dos ids define o novo {@code order_index} (a
 * posição na lista). O frontend envia a lista inteira após um arrastar-soltar.
 */
public record SectionReorderRequest(
        @NotEmpty List<Long> ids) {}
