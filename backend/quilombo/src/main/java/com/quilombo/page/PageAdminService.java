package com.quilombo.page;

import com.quilombo.auth.AdminSessionService;
import com.quilombo.page.dto.AdminPageResponse;
import com.quilombo.page.dto.SectionContentRequest;
import com.quilombo.page.dto.SectionCreateRequest;
import com.quilombo.page.dto.SectionReorderRequest;
import com.quilombo.page.dto.StyleOption;
import com.quilombo.page.dto.StyleUpdateRequest;
import com.quilombo.security.JwtPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Configuração da página institucional na visão do admin: estilo/paleta e o CRUD
 * de seções. Leituras e escritas tenant-scoped ({@code @TenantId} + RLS); estilo
 * e tipo de seção são validados contra os catálogos {@link PageStyle} e
 * {@link SectionType} antes de persistir. Toda mutação devolve a página completa
 * (com seções inativas), única fonte de verdade do painel.
 */
@Service
@RequiredArgsConstructor
public class PageAdminService {

    /** Máximo de seções por comunidade, como o {@code SECTIONS_LIMIT} do MVP. */
    public static final int MAX_SECTIONS = 20;

    private final AdminSessionService adminSession;
    private final InstitutionalPageRepository institutionalPages;
    private final PageSectionRepository sections;

    /** Catálogo de estilos, na forma {@code {id: {label, palettes}}} como no MVP. */
    public Map<String, StyleOption> styles(JwtPrincipal principal) {
        adminSession.requireAdmin(principal);
        return Arrays.stream(PageStyle.values())
                .collect(Collectors.toMap(
                        PageStyle::id,
                        StyleOption::from,
                        (a, b) -> a,
                        LinkedHashMap::new));
    }

    /** Página completa do tenant, incluindo seções inativas (defaults sem linha). */
    @Transactional(readOnly = true)
    public AdminPageResponse page(JwtPrincipal principal) {
        adminSession.requireAdmin(principal);
        return snapshot();
    }

    @Transactional
    public AdminPageResponse updateStyle(JwtPrincipal principal, StyleUpdateRequest request) {
        adminSession.requireAdmin(principal);

        var style = PageStyle.fromId(request.style())
                .orElseThrow(() -> new InvalidPageStyleException("Estilo inválido"));
        if (!style.palettes().contains(request.palette())) {
            throw new InvalidPageStyleException("Paleta inválida para este estilo");
        }

        // primeira escolha cria a linha; @TenantId preenche o community_id
        var page = institutionalPages.findTopByOrderByIdAsc()
                .orElseGet(InstitutionalPage::new);
        page.setStyle(style.id());
        page.setPalette(request.palette());
        institutionalPages.save(page);

        return snapshot();
    }

    /**
     * Cria uma seção no fim da ordem. Valida o tipo contra o catálogo e o limite
     * de {@link #MAX_SECTIONS} por comunidade, como no MVP.
     */
    @Transactional
    public AdminPageResponse createSection(JwtPrincipal principal, SectionCreateRequest request) {
        adminSession.requireAdmin(principal);

        var type = SectionType.fromId(request.sectionType())
                .orElseThrow(InvalidSectionTypeException::new);

        var existing = sections.findAllByOrderByOrderIndexAsc();
        if (existing.size() >= MAX_SECTIONS) {
            throw new SectionLimitReachedException(MAX_SECTIONS);
        }
        var nextOrder = existing.stream()
                .mapToInt(PageSection::getOrderIndex)
                .max()
                .orElse(-1) + 1;

        var section = new PageSection();
        section.setSectionType(type.id());
        section.setOrderIndex(nextOrder);
        section.setActive(true);
        section.setContent(request.content() == null ? new HashMap<>() : request.content());
        sections.save(section);

        return snapshot();
    }

    /** Substitui o documento JSON de uma seção do tenant. */
    @Transactional
    public AdminPageResponse updateSectionContent(
            JwtPrincipal principal, Long sectionId, SectionContentRequest request) {
        adminSession.requireAdmin(principal);

        var section = requireSection(sectionId);
        section.setContent(request.content());
        sections.save(section);

        return snapshot();
    }

    /**
     * Reordena em lote: a posição de cada id na lista vira o novo
     * {@code order_index}. Qualquer id desconhecido (ou de outro tenant) aborta a
     * operação inteira com 404 — a reordenação é tudo-ou-nada.
     */
    @Transactional
    public AdminPageResponse reorderSections(JwtPrincipal principal, SectionReorderRequest request) {
        adminSession.requireAdmin(principal);

        var ids = request.ids();
        for (var i = 0; i < ids.size(); i++) {
            var section = requireSection(ids.get(i));
            section.setOrderIndex(i);
            sections.save(section);
        }

        return snapshot();
    }

    /** Alterna a visibilidade de uma seção (some/aparece na página pública). */
    @Transactional
    public AdminPageResponse toggleSection(JwtPrincipal principal, Long sectionId) {
        adminSession.requireAdmin(principal);

        var section = requireSection(sectionId);
        section.setActive(!section.isActive());
        sections.save(section);

        return snapshot();
    }

    /** Remove uma seção do tenant; a ordem das demais é preservada (com lacuna). */
    @Transactional
    public AdminPageResponse deleteSection(JwtPrincipal principal, Long sectionId) {
        adminSession.requireAdmin(principal);

        sections.delete(requireSection(sectionId));

        return snapshot();
    }

    /** Seção do tenant atual; ausência ({@code @TenantId} filtra) vira 404. */
    private PageSection requireSection(Long sectionId) {
        return sections.findById(sectionId)
                .orElseThrow(SectionNotFoundException::new);
    }

    /** Página + seções (inclusive inativas) na forma que o painel consome. */
    private AdminPageResponse snapshot() {
        var page = institutionalPages.findTopByOrderByIdAsc()
                .orElseGet(InstitutionalPage::new);
        List<PageSection> all = sections.findAllByOrderByOrderIndexAsc();
        return AdminPageResponse.from(page, all);
    }
}
