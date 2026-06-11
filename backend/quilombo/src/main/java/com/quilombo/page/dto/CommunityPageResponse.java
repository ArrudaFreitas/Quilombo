package com.quilombo.page.dto;

import com.quilombo.community.Community;
import com.quilombo.community.CommunityProfile;
import com.quilombo.page.InstitutionalPage;
import com.quilombo.page.PageSection;

import java.util.List;
import java.util.Map;

/**
 * Página institucional pública do tenant: identidade da comunidade, card,
 * configuração visual e as seções ativas em ordem de exibição.
 */
public record CommunityPageResponse(
        CommunityInfo community,
        CardInfo card,
        PageConfig page,
        List<SectionItem> sections) {

    public record CommunityInfo(String slug, String name, String location) {

        public static CommunityInfo from(Community community) {
            return new CommunityInfo(
                    community.getSlug(), community.getName(), community.getLocation());
        }
    }

    /** {@code null} na resposta enquanto o admin não preencher o perfil. */
    public record CardInfo(String imageUrl, String shortDescription) {

        public static CardInfo from(CommunityProfile profile) {
            return new CardInfo(profile.getImageUrl(), profile.getShortDescription());
        }
    }

    public record PageConfig(String style, String palette) {

        public static PageConfig from(InstitutionalPage page) {
            return new PageConfig(page.getStyle(), page.getPalette());
        }
    }

    public record SectionItem(Long id, String sectionType, Map<String, Object> content) {

        public static SectionItem from(PageSection section) {
            return new SectionItem(section.getId(), section.getSectionType(), section.getContent());
        }
    }
}
