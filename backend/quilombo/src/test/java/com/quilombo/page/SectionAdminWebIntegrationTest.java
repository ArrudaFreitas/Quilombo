package com.quilombo.page;

import com.quilombo.TestDatabase;
import com.quilombo.TestcontainersConfiguration;
import com.quilombo.auth.Admin;
import com.quilombo.auth.AdminRepository;
import com.quilombo.auth.AuthService;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * CRUD de seções de ponta a ponta: criação com validação de tipo e do limite de
 * {@value com.quilombo.page.PageAdminService#MAX_SECTIONS}, edição de conteúdo,
 * reordenação em lote (atômica), toggle refletido na página pública, remoção e
 * as recusas (404 por id desconhecido, 401 sem token).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@ActiveProfiles("dev")
class SectionAdminWebIntegrationTest {

    private static final String ADMIN_EMAIL = "admin@kalunga.org";
    private static final String SECTIONS_URL = "https://kalunga.quilombo.localhost/api/v1/admin/sections";
    private static final String PUBLIC_URL = "https://kalunga.quilombo.localhost/api/v1/community";

    @Autowired
    MockMvc mockMvc;

    @Autowired
    AuthService authService;

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
    void create_appends_an_active_section_of_the_given_type() throws Exception {
        mockMvc.perform(post(SECTIONS_URL)
                        .header("Authorization", "Bearer " + login())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sectionType\":\"hero\",\"content\":{\"title\":\"Bem-vindos\"}}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.sections.length()").value(1))
                .andExpect(jsonPath("$.data.sections[0].sectionType").value("hero"))
                .andExpect(jsonPath("$.data.sections[0].orderIndex").value(0))
                .andExpect(jsonPath("$.data.sections[0].active").value(true))
                .andExpect(jsonPath("$.data.sections[0].content.title").value("Bem-vindos"));
    }

    @Test
    void create_places_each_new_section_after_the_last() throws Exception {
        var jwt = login();
        createSection(jwt, "hero");
        createSection(jwt, "timeline");

        mockMvc.perform(post(SECTIONS_URL)
                        .header("Authorization", "Bearer " + jwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sectionType\":\"location\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.sections.length()").value(3))
                .andExpect(jsonPath("$.data.sections[2].sectionType").value("location"))
                .andExpect(jsonPath("$.data.sections[2].orderIndex").value(2));
    }

    @Test
    void create_rejects_a_type_outside_the_catalog() throws Exception {
        mockMvc.perform(post(SECTIONS_URL)
                        .header("Authorization", "Bearer " + login())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sectionType\":\"newsletter\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Tipo de seção inválido"));
    }

    @Test
    void create_blank_type_fails_bean_validation() throws Exception {
        mockMvc.perform(post(SECTIONS_URL)
                        .header("Authorization", "Bearer " + login())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sectionType\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Falha de validação"))
                .andExpect(jsonPath("$.errors[0].field").value("sectionType"));
    }

    @Test
    void create_beyond_the_limit_is_rejected() throws Exception {
        inTenant(() -> {
            for (var i = 0; i < PageAdminService.MAX_SECTIONS; i++) {
                section("hero", i, true);
            }
        });

        mockMvc.perform(post(SECTIONS_URL)
                        .header("Authorization", "Bearer " + login())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sectionType\":\"hero\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Limite de 20 seções atingido"));
    }

    @Test
    void update_content_replaces_the_document_and_shows_on_the_public_page() throws Exception {
        var jwt = login();
        var id = inTenantId(() -> section("description_long", 0, true));

        mockMvc.perform(put(SECTIONS_URL + "/" + id)
                        .header("Authorization", "Bearer " + jwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":{\"text\":\"Nossa história\"}}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.sections[0].content.text").value("Nossa história"));

        mockMvc.perform(get(PUBLIC_URL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.sections[0].content.text").value("Nossa história"));
    }

    @Test
    void update_of_an_unknown_section_is_404() throws Exception {
        mockMvc.perform(put(SECTIONS_URL + "/999999")
                        .header("Authorization", "Bearer " + login())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":{}}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Seção não encontrada"));
    }

    @Test
    void reorder_reassigns_order_by_position() throws Exception {
        var jwt = login();
        var first = inTenantId(() -> section("hero", 0, true));
        var second = inTenantId(() -> section("timeline", 1, true));
        var third = inTenantId(() -> section("location", 2, true));

        mockMvc.perform(put(SECTIONS_URL + "/reorder")
                        .header("Authorization", "Bearer " + jwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"ids\":[" + third + "," + first + "," + second + "]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.sections[0].sectionType").value("location"))
                .andExpect(jsonPath("$.data.sections[0].orderIndex").value(0))
                .andExpect(jsonPath("$.data.sections[1].sectionType").value("hero"))
                .andExpect(jsonPath("$.data.sections[2].sectionType").value("timeline"));
    }

    @Test
    void reorder_with_an_unknown_id_aborts_and_keeps_the_original_order() throws Exception {
        var jwt = login();
        var first = inTenantId(() -> section("hero", 0, true));
        var second = inTenantId(() -> section("timeline", 1, true));

        mockMvc.perform(put(SECTIONS_URL + "/reorder")
                        .header("Authorization", "Bearer " + jwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"ids\":[" + second + "," + first + ",999999]}"))
                .andExpect(status().isNotFound());

        // a tentativa parcial foi revertida: ordem original preservada
        mockMvc.perform(get("https://kalunga.quilombo.localhost/api/v1/admin/page")
                        .header("Authorization", "Bearer " + jwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.sections[0].sectionType").value("hero"))
                .andExpect(jsonPath("$.data.sections[0].orderIndex").value(0))
                .andExpect(jsonPath("$.data.sections[1].sectionType").value("timeline"))
                .andExpect(jsonPath("$.data.sections[1].orderIndex").value(1));
    }

    @Test
    void reorder_with_empty_list_fails_bean_validation() throws Exception {
        mockMvc.perform(put(SECTIONS_URL + "/reorder")
                        .header("Authorization", "Bearer " + login())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"ids\":[]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Falha de validação"));
    }

    @Test
    void toggle_hides_the_section_from_the_public_page_and_brings_it_back() throws Exception {
        var jwt = login();
        var id = inTenantId(() -> section("hero", 0, true));

        // visível antes do toggle
        mockMvc.perform(get(PUBLIC_URL))
                .andExpect(jsonPath("$.data.sections.length()").value(1));

        mockMvc.perform(patch(SECTIONS_URL + "/" + id + "/toggle")
                        .header("Authorization", "Bearer " + jwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.sections[0].active").value(false));

        // some da página pública
        mockMvc.perform(get(PUBLIC_URL))
                .andExpect(jsonPath("$.data.sections.length()").value(0));

        // segundo toggle reativa
        mockMvc.perform(patch(SECTIONS_URL + "/" + id + "/toggle")
                        .header("Authorization", "Bearer " + jwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.sections[0].active").value(true));

        mockMvc.perform(get(PUBLIC_URL))
                .andExpect(jsonPath("$.data.sections.length()").value(1));
    }

    @Test
    void toggle_of_an_unknown_section_is_404() throws Exception {
        mockMvc.perform(patch(SECTIONS_URL + "/999999/toggle")
                        .header("Authorization", "Bearer " + login()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Seção não encontrada"));
    }

    @Test
    void delete_removes_the_section() throws Exception {
        var jwt = login();
        var keep = inTenantId(() -> section("hero", 0, true));
        var drop = inTenantId(() -> section("timeline", 1, true));

        mockMvc.perform(delete(SECTIONS_URL + "/" + drop)
                        .header("Authorization", "Bearer " + jwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.sections.length()").value(1))
                .andExpect(jsonPath("$.data.sections[0].id").value(keep));
    }

    @Test
    void delete_of_an_unknown_section_is_404() throws Exception {
        mockMvc.perform(delete(SECTIONS_URL + "/999999")
                        .header("Authorization", "Bearer " + login()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Seção não encontrada"));
    }

    @Test
    void without_token_is_401() throws Exception {
        mockMvc.perform(post(SECTIONS_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sectionType\":\"hero\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Sessão inválida"));
    }

    private void createSection(String jwt, String type) throws Exception {
        mockMvc.perform(post(SECTIONS_URL)
                        .header("Authorization", "Bearer " + jwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sectionType\":\"" + type + "\"}"))
                .andExpect(status().isOk());
    }

    private Long section(String type, int order, boolean active) {
        var section = new PageSection();
        section.setSectionType(type);
        section.setOrderIndex(order);
        section.setActive(active);
        section.setContent(Map.of());
        return sections.save(section).getId();
    }

    private void inTenant(Runnable block) {
        TenantContext.setCommunityId(kalungaId);
        try {
            block.run();
        } finally {
            TenantContext.clear();
        }
    }

    private Long inTenantId(java.util.function.Supplier<Long> block) {
        TenantContext.setCommunityId(kalungaId);
        try {
            return block.get();
        } finally {
            TenantContext.clear();
        }
    }

    /** Executa a troca real do código no subdomínio kalunga e devolve o JWT. */
    private String login() throws Exception {
        var code = authService.issueLoginCode(ADMIN_EMAIL, "Maria");
        var body = mockMvc.perform(post("https://kalunga.quilombo.localhost/api/v1/auth/token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"" + code + "\"}"))
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
