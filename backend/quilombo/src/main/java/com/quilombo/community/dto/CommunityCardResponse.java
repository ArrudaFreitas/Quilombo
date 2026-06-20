package com.quilombo.community.dto;

import com.quilombo.community.CommunityCard;

/**
 * Item da listagem pública de comunidades. {@code slug} acompanha o card apenas
 * para o front construir o link do subdomínio ({@code <slug>.quilombo...}).
 */
public record CommunityCardResponse(
        String slug,
        String name,
        String location,
        String imageUrl,
        String imageAltText,
        String shortDescription) {

    public static CommunityCardResponse from(CommunityCard card) {
        return new CommunityCardResponse(
                card.getCommunitySlug(),
                card.getName(),
                card.getLocation(),
                card.getImageUrl(),
                card.getImageAltText(),
                card.getShortDescription());
    }
}
