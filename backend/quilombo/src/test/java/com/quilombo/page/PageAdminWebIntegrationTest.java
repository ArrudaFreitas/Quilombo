package com.quilombo.page;

import com.quilombo.TestDatabase;
import com.quilombo.TestcontainersConfiguration;
import com.quilombo.auth.Admin;
import com.quilombo.auth.AdminRepository;
import com.quilombo.auth.EmailHasher;
import com.quilombo.community.Community;
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
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.json.JsonMapper;

import java.sql.SQLException;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Administração de estilo/paleta de ponta a ponta: catálogo, leitura da página
 * com seções inativas (diferente da pública), troca persistida e refletida na
 * página pública, validação da combinação contra o catálogo e recusa sem token.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@ActiveProfiles("dev")
class PageAdminWebIntegrationTest {

    private static final String ADMIN_EMAIL = "admin@kalunga.org";
    private static final String ADMIN_URL = "https://kalunga.quilombo.localhost/api/v1/admin";

    @Autowired
    MockMvc mockMvc;


    @Autowired
    AdminRepository admins;

    @Autowired
    CommunityRepository communities;

    @Autowired
    PageSectionRepository sections;

    @Autowired
    EmailHasher emailHasher;

    @Value("${spring.datasource.url}")
    String jdbcUrl;

    @Value("${spring.flyway.user}")
    String ownerUser;

    @Value("${spring.flyway.password}")
    String ownerPassword;

    Long kalungaId;

    @BeforeEach
    void seed() throws SQLException {
        TestDatabase.wipe(jdbcUrl, ownerUser, ownerPassword);
        kalungaId = communities
                .save(community("kalunga", "Kalunga", "Chapada dos Veadeiros, GO")).getId();

        TenantContext.setCommunityId(kalungaId);
        var admin = new Admin();
        admin.setEmailHash(emailHasher.hash(ADMIN_EMAIL));
        admins.save(admin);
        TenantContext.clear();
    }

    @AfterEach
    void clearTenant() {
        TenantContext.clear();
    }

    @Test
    void styles_catalog_lists_both_styles_with_the_four_palettes() throws Exception {
        mockMvc.perform(get(ADMIN_URL + "/styles").header("Authorization", "Bearer " + login()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.uniao.label").value("União & Comunidade"))
                .andExpect(jsonPath("$.data.raizes.label").value("Raízes"))
                .andExpect(jsonPath("$.data.uniao.palettes.length()").value(4))
                .andExpect(jsonPath("$.data.raizes.palettes")
                        .value(org.hamcrest.Matchers.contains(
                                "verde", "terracota", "ocre", "indigo")));
    }

    @Test
    void page_without_configuration_returns_defaults_and_no_sections() throws Exception {
        mockMvc.perform(get(ADMIN_URL + "/page").header("Authorization", "Bearer " + login()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.style").value("uniao"))
                .andExpect(jsonPath("$.data.palette").value("verde"))
                .andExpect(jsonPath("$.data.sections.length()").value(0));
    }

    @Test
    void admin_page_includes_inactive_sections_unlike_the_public_one() throws Exception {
        inTenant(() -> {
            section("hero", 0, true);
            section("timeline", 1, false);
        });

        mockMvc.perform(get(ADMIN_URL + "/page").header("Authorization", "Bearer " + login()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.sections.length()").value(2))
                .andExpect(jsonPath("$.data.sections[1].sectionType").value("timeline"))
                .andExpect(jsonPath("$.data.sections[1].active").value(false))
                .andExpect(jsonPath("$.data.sections[1].orderIndex").value(1));

        // a página pública continua exibindo só a ativa
        mockMvc.perform(get("https://kalunga.quilombo.localhost/api/v1/community"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.sections.length()").value(1));
    }

    @Test
    void valid_style_change_persists_and_shows_on_the_public_page() throws Exception {
        var jwt = login();

        mockMvc.perform(put(ADMIN_URL + "/page/style")
                        .header("Authorization", "Bearer " + jwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"style\":\"raizes\",\"palette\":\"terracota\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.style").value("raizes"))
                .andExpect(jsonPath("$.data.palette").value("terracota"));

        mockMvc.perform(get("https://kalunga.quilombo.localhost/api/v1/community"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.page.style").value("raizes"))
                .andExpect(jsonPath("$.data.page.palette").value("terracota"));
    }

    @Test
    void unknown_style_is_rejected_with_400() throws Exception {
        mockMvc.perform(put(ADMIN_URL + "/page/style")
                        .header("Authorization", "Bearer " + login())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"style\":\"classic\",\"palette\":\"verde\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Estilo inválido"));
    }

    @Test
    void palette_outside_the_catalog_is_rejected_with_400() throws Exception {
        mockMvc.perform(put(ADMIN_URL + "/page/style")
                        .header("Authorization", "Bearer " + login())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"style\":\"uniao\",\"palette\":\"rosa\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Paleta inválida para este estilo"));
    }

    @Test
    void blank_fields_fail_bean_validation() throws Exception {
        mockMvc.perform(put(ADMIN_URL + "/page/style")
                        .header("Authorization", "Bearer " + login())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"style\":\"\",\"palette\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Falha de validação"));
    }

    @Test
    void without_token_is_401() throws Exception {
        mockMvc.perform(get(ADMIN_URL + "/styles"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Sessão inválida"));
    }

    private void section(String type, int order, boolean active) {
        var section = new PageSection();
        section.setSectionType(type);
        section.setOrderIndex(order);
        section.setActive(active);
        section.setContent(Map.of());
        sections.save(section);
    }

    private void inTenant(Runnable block) {
        TenantContext.setCommunityId(kalungaId);
        try {
            block.run();
        } finally {
            TenantContext.clear();
        }
    }

    /** Faz o login real (idToken stubado) no subdomínio kalunga e devolve o JWT. */
    private String login() throws Exception {
        var body = mockMvc.perform(post("https://kalunga.quilombo.localhost/api/v1/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idToken\":\"" + ADMIN_EMAIL + "|Maria\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return JsonMapper.builder().build().readTree(body).get("data").get("token").asString();
    }

    private static Community community(String slug, String name, String location) {
        var community = new Community();
        community.setSlug(slug);
        community.setName(name);
        community.setLocation(location);
        return community;
    }
}
