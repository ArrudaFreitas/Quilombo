package com.quilombo.page.dto;

import com.quilombo.page.InstitutionalPage;
import com.quilombo.page.PageSection;

import java.util.List;
import java.util.Map;

/**
 * Configuração da página na visão do admin: diferente da resposta pública,
 * inclui as seções inativas e os campos de controle ({@code orderIndex},
 * {@code active}) que o painel usa para reordenar e alternar visibilidade.
 */
public record AdminPageResponse(
        String style,
        String palette,
        List<AdminSectionItem> sections) {

    public static AdminPageResponse from(InstitutionalPage page, List<PageSection> sections) {
        return new AdminPageResponse(
                page.getStyle(),
                page.getPalette(),
                sections.stream().map(AdminSectionItem::from).toList());
    }

    public record AdminSectionItem(
            Long id,
            String sectionType,
            int orderIndex,
            boolean active,
            Map<String, Object> content) {

        public static AdminSectionItem from(PageSection section) {
            return new AdminSectionItem(
                    section.getId(),
                    section.getSectionType(),
                    section.getOrderIndex(),
                    section.isActive(),
                    section.getContent());
        }
    }
}
