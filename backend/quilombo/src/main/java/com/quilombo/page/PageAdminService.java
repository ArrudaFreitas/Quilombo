package com.quilombo.page;

import com.quilombo.auth.AdminSessionService;
import com.quilombo.page.dto.AdminPageResponse;
import com.quilombo.page.dto.StyleOption;
import com.quilombo.page.dto.StyleUpdateRequest;
import com.quilombo.security.JwtPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Configuração da página institucional na visão do admin. Leituras e escritas
 * tenant-scoped ({@code @TenantId} + RLS); a combinação estilo+paleta é validada
 * contra o catálogo {@link PageStyle} antes de persistir.
 */
@Service
@RequiredArgsConstructor
public class PageAdminService {

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
        var page = institutionalPages.findTopByOrderByIdAsc()
                .orElseGet(InstitutionalPage::new);
        return AdminPageResponse.from(page, sections.findAllByOrderByOrderIndexAsc());
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

        return AdminPageResponse.from(page, sections.findAllByOrderByOrderIndexAsc());
    }
}
