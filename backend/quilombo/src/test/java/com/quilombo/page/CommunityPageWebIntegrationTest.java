package com.quilombo.page;

import com.quilombo.TestDatabase;
import com.quilombo.TestcontainersConfiguration;
import com.quilombo.community.Community;
import com.quilombo.community.CommunityProfile;
import com.quilombo.community.CommunityProfileRepository;
import com.quilombo.community.CommunityRepository;
import com.quilombo.tenant.TenantContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.sql.SQLException;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Página institucional pública de ponta a ponta: tenant resolvido pelo
 * subdomínio, leituras tenant-scoped (seções de outra comunidade não vazam),
 * defaults quando nada foi configurado e seções inativas fora da resposta.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@ActiveProfiles("dev")
class CommunityPageWebIntegrationTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    CommunityRepository communities;

    @Autowired
    CommunityProfileRepository profiles;

    @Autowired
    InstitutionalPageRepository institutionalPages;

    @Autowired
    PageSectionRepository sections;

    @Value("${spring.datasource.url}")
    String jdbcUrl;

    @Value("${spring.flyway.user}")
    String ownerUser;

    @Value("${spring.flyway.password}")
    String ownerPassword;

    Long kalungaId;
    Long palmaresId;

    @BeforeEach
    void seed() throws SQLException {
        TestDatabase.wipe(jdbcUrl, ownerUser, ownerPassword);
        kalungaId = community("kalunga", "Kalunga", "Chapada dos Veadeiros, GO");
        palmaresId = community("palmares", "Quilombo dos Palmares", "União dos Palmares, AL");

        // conteúdo da kalunga — cada save abre a própria sessão com o tenant vigente
        inTenant(kalungaId, () -> {
            var profile = new CommunityProfile();
            profile.setImageUrl("/uploads/kalunga.webp");
            profile.setShortDescription("Maior comunidade quilombola do país");
            profiles.save(profile);

            var page = new InstitutionalPage();
            page.setStyle("raizes");
            page.setPalette("terracota");
            institutionalPages.save(page);

            section("hero", 0, true, Map.of("title", "Bem-vindo à Kalunga"));
            section("timeline", 1, false, Map.of("events", "rascunho"));
            section("location", 2, true, Map.of("lat", -13.5, "lng", -47.4));
        });

        // conteúdo de outro tenant — não pode vazar na página da kalunga
        inTenant(palmaresId, () ->
                section("hero", 0, true, Map.of("title", "Palmares vive")));
    }

    @AfterEach
    void clearTenant() {
        TenantContext.clear();
    }

    @Test
    void renders_configured_page_with_only_active_sections_in_order() throws Exception {
        mockMvc.perform(get("https://kalunga.quilombo.localhost/api/v1/community"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.community.slug").value("kalunga"))
                .andExpect(jsonPath("$.data.community.name").value("Kalunga"))
                .andExpect(jsonPath("$.data.community.location").value("Chapada dos Veadeiros, GO"))
                .andExpect(jsonPath("$.data.card.imageUrl").value("/uploads/kalunga.webp"))
                .andExpect(jsonPath("$.data.card.shortDescription")
                        .value("Maior comunidade quilombola do país"))
                .andExpect(jsonPath("$.data.page.style").value("raizes"))
                .andExpect(jsonPath("$.data.page.palette").value("terracota"))
                // a timeline inativa fica de fora; hero e location na ordem definida
                .andExpect(jsonPath("$.data.sections.length()").value(2))
                .andExpect(jsonPath("$.data.sections[0].sectionType").value("hero"))
                .andExpect(jsonPath("$.data.sections[0].content.title").value("Bem-vindo à Kalunga"))
                .andExpect(jsonPath("$.data.sections[1].sectionType").value("location"))
                .andExpect(jsonPath("$.data.sections[1].content.lat").value(-13.5))
                .andExpect(jsonPath("$.meta.timestamp").exists());
    }

    @Test
    void unconfigured_community_degrades_to_defaults_instead_of_404() throws Exception {
        mockMvc.perform(get("https://palmares.quilombo.localhost/api/v1/community"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.community.slug").value("palmares"))
                .andExpect(jsonPath("$.data.card").doesNotExist())
                .andExpect(jsonPath("$.data.page.style").value("uniao"))
                .andExpect(jsonPath("$.data.page.palette").value("verde"))
                // só a seção do próprio tenant aparece
                .andExpect(jsonPath("$.data.sections.length()").value(1))
                .andExpect(jsonPath("$.data.sections[0].content.title").value("Palmares vive"));
    }

    @Test
    void root_domain_returns_400_problem_detail() throws Exception {
        mockMvc.perform(get("https://quilombo.localhost/api/v1/community"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail")
                        .value("A página institucional exige o subdomínio da comunidade"));
    }

    @Test
    void unknown_subdomain_returns_404() throws Exception {
        mockMvc.perform(get("https://fantasma.quilombo.localhost/api/v1/community"))
                .andExpect(status().isNotFound());
    }

    private Long community(String slug, String name, String location) {
        var community = new Community();
        community.setSlug(slug);
        community.setName(name);
        community.setLocation(location);
        return communities.save(community).getId();
    }

    private void section(String type, int order, boolean active, Map<String, Object> content) {
        var section = new PageSection();
        section.setSectionType(type);
        section.setOrderIndex(order);
        section.setActive(active);
        section.setContent(content);
        sections.save(section);
    }

    private void inTenant(Long communityId, Runnable block) {
        TenantContext.setCommunityId(communityId);
        try {
            block.run();
        } finally {
            TenantContext.clear();
        }
    }
}
