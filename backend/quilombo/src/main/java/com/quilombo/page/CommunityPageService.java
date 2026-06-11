package com.quilombo.page;

import com.quilombo.community.CommunityProfileRepository;
import com.quilombo.community.CommunityRepository;
import com.quilombo.page.dto.CommunityPageResponse;
import com.quilombo.page.dto.CommunityPageResponse.CardInfo;
import com.quilombo.page.dto.CommunityPageResponse.CommunityInfo;
import com.quilombo.page.dto.CommunityPageResponse.PageConfig;
import com.quilombo.page.dto.CommunityPageResponse.SectionItem;
import com.quilombo.tenant.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Página institucional pública do tenant atual (resolvido pelo subdomínio).
 * Todas as leituras são tenant-scoped ({@code @TenantId} + RLS); card e
 * configuração ausentes degradam para os defaults — a página nunca dá 404
 * para uma comunidade existente, mesmo sem nada configurado.
 */
@Service
@RequiredArgsConstructor
public class CommunityPageService {

    private final CommunityRepository communities;
    private final CommunityProfileRepository profiles;
    private final InstitutionalPageRepository institutionalPages;
    private final PageSectionRepository sections;

    @Transactional(readOnly = true)
    public CommunityPageResponse publicPage() {
        var communityId = TenantContext.getCommunityId()
                .orElseThrow(PageTenantRequiredException::new);

        // o interceptor já resolveu o tenant; ausência aqui é estado impossível
        var community = communities.findById(communityId)
                .orElseThrow(() -> new IllegalStateException(
                        "Tenant resolvido sem comunidade correspondente: " + communityId));

        var card = profiles.findTopByOrderByIdAsc()
                .map(CardInfo::from)
                .orElse(null);

        // sem linha configurada, os defaults vêm da própria entidade (uniao/verde)
        var page = institutionalPages.findTopByOrderByIdAsc()
                .map(PageConfig::from)
                .orElseGet(() -> PageConfig.from(new InstitutionalPage()));

        var activeSections = sections.findByActiveTrueOrderByOrderIndexAsc().stream()
                .map(SectionItem::from)
                .toList();

        return new CommunityPageResponse(
                CommunityInfo.from(community), card, page, activeSections);
    }
}
