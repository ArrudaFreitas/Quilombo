package com.quilombo.community;

import com.quilombo.community.dto.CommunityCardResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Diretório público de comunidades. Lê a tabela desnormalizada
 * {@code community_cards} — sem tenant e sem autenticação: é a única leitura
 * cross-tenant da API, segura por construção (a tabela só contém o que cada
 * comunidade publica no próprio card).
 */
@Service
@RequiredArgsConstructor
public class CommunityDirectoryService {

    private final CommunityCardRepository repository;

    /** Lista paginada; {@code name} em branco equivale a sem filtro. */
    @Transactional(readOnly = true)
    public Page<CommunityCardResponse> list(String name, Pageable pageable) {
        var filter = name == null ? "" : name.trim();
        var page = filter.isEmpty()
                ? repository.findAll(pageable)
                : repository.findByNameContainingIgnoreCase(filter, pageable);
        return page.map(CommunityCardResponse::from);
    }
}
