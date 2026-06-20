package com.quilombo.community;

import com.quilombo.auth.AdminSessionService;
import com.quilombo.auth.InvalidSessionException;
import com.quilombo.community.dto.CardResponse;
import com.quilombo.community.dto.CardUpdateRequest;
import com.quilombo.security.JwtPrincipal;
import com.quilombo.tenant.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Card da comunidade na visão do admin. A escrita acontece no
 * {@link CommunityProfile} (tenant-scoped, {@code @TenantId} + RLS) e é
 * sincronizada para o {@link CommunityCard} desnormalizado que o diretório
 * público lê — único caminho de escrita do card, como no MVP.
 */
@Service
@RequiredArgsConstructor
public class CardAdminService {

    private final AdminSessionService adminSession;
    private final CommunityRepository communities;
    private final CommunityProfileRepository profiles;
    private final CommunityCardRepository cards;

    @Transactional(readOnly = true)
    public CardResponse get(JwtPrincipal principal) {
        adminSession.requireAdmin(principal);
        var community = currentCommunity();
        var profile = profiles.findTopByOrderByIdAsc().orElse(null);
        return CardResponse.from(community, profile);
    }

    @Transactional
    public CardResponse update(JwtPrincipal principal, CardUpdateRequest request) {
        adminSession.requireAdmin(principal);
        var community = currentCommunity();

        // primeira escrita cria o perfil; @TenantId preenche o community_id
        var profile = profiles.findTopByOrderByIdAsc().orElseGet(CommunityProfile::new);
        profile.setImageUrl(request.imageUrl());
        profile.setImageAltText(request.imageAltText());
        profile.setShortDescription(request.shortDescription());
        profiles.save(profile);

        var card = cards.findByCommunitySlug(community.getSlug())
                .orElseGet(() -> newCard(community));
        card.setImageUrl(request.imageUrl());
        card.setImageAltText(request.imageAltText());
        card.setShortDescription(request.shortDescription());
        cards.save(card);

        return CardResponse.from(community, profile);
    }

    /** O admin só passa pelo requireAdmin com tenant no contexto (JWT + interceptor). */
    private Community currentCommunity() {
        return TenantContext.getCommunityId()
                .flatMap(communities::findById)
                .orElseThrow(InvalidSessionException::new);
    }

    private static CommunityCard newCard(Community community) {
        var card = new CommunityCard();
        card.setCommunitySlug(community.getSlug());
        card.setName(community.getName());
        card.setLocation(community.getLocation());
        return card;
    }
}
