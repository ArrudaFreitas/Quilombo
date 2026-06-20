package com.quilombo.community.dto;

import com.quilombo.community.Community;
import com.quilombo.community.CommunityProfile;

/**
 * Card da comunidade na visão do admin. {@code name} e {@code location} vêm da
 * comunidade (somente leitura); imagem e descrição são os campos editáveis.
 */
public record CardResponse(
        String name,
        String location,
        String imageUrl,
        String imageAltText,
        String shortDescription) {

    public static CardResponse from(Community community, CommunityProfile profile) {
        return new CardResponse(
                community.getName(),
                community.getLocation(),
                profile != null ? profile.getImageUrl() : null,
                profile != null ? profile.getImageAltText() : null,
                profile != null ? profile.getShortDescription() : null);
    }
}
