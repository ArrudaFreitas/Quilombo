package com.quilombo.community;

import com.quilombo.TestDatabase;
import com.quilombo.TestcontainersConfiguration;
import com.quilombo.auth.Admin;
import com.quilombo.auth.AdminRepository;
import com.quilombo.auth.AuthService;
import com.quilombo.auth.EmailHasher;
import com.quilombo.tenant.TenantContext;
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

import java.sql.DriverManager;
import java.sql.SQLException;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Administração do card de ponta a ponta: login real (código → JWT), leitura e
 * escrita do card no subdomínio do tenant, sincronização com o diretório público
 * e as recusas — sem token, tenant divergente e admin removido da allowlist.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@ActiveProfiles("dev")
class CardAdminWebIntegrationTest {

    private static final String ADMIN_EMAIL = "admin@kalunga.org";
    private static final String CARD_URL = "https://kalunga.quilombo.localhost/api/v1/admin/card";

    @Autowired
    MockMvc mockMvc;

    @Autowired
    AuthService authService;

    @Autowired
    AdminRepository admins;

    @Autowired
    CommunityRepository communities;

    @Autowired
    EmailHasher emailHasher;

    @Value("${spring.datasource.url}")
    String jdbcUrl;

    @Value("${spring.flyway.user}")
    String ownerUser;

    @Value("${spring.flyway.password}")
    String ownerPassword;

    Long adminId;

    @BeforeEach
    void seed() throws SQLException {
        TestDatabase.wipe(jdbcUrl, ownerUser, ownerPassword);
        var kalungaId = communities
                .save(community("kalunga", "Kalunga", "Chapada dos Veadeiros, GO")).getId();
        communities.save(community("palmares", "Quilombo dos Palmares", "União dos Palmares, AL"));

        TenantContext.setCommunityId(kalungaId);
        var admin = new Admin();
        admin.setEmailHash(emailHasher.hash(ADMIN_EMAIL));
        adminId = admins.save(admin).getId();
        TenantContext.clear();
    }

    @Test
    void get_returns_community_identity_with_empty_editable_fields() throws Exception {
        mockMvc.perform(get(CARD_URL).header("Authorization", "Bearer " + login()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("Kalunga"))
                .andExpect(jsonPath("$.data.location").value("Chapada dos Veadeiros, GO"))
                .andExpect(jsonPath("$.data.imageUrl").doesNotExist())
                .andExpect(jsonPath("$.data.shortDescription").doesNotExist());
    }

    @Test
    void put_creates_profile_and_syncs_the_public_directory_card() throws Exception {
        var jwt = login();

        mockMvc.perform(put(CARD_URL)
                        .header("Authorization", "Bearer " + jwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"imageUrl\":\"/uploads/kalunga.webp\","
                                + "\"shortDescription\":\"O maior quilombo do Brasil\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.imageUrl").value("/uploads/kalunga.webp"))
                .andExpect(jsonPath("$.data.shortDescription").value("O maior quilombo do Brasil"));

        // a leitura admin reflete a escrita
        mockMvc.perform(get(CARD_URL).header("Authorization", "Bearer " + jwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.shortDescription").value("O maior quilombo do Brasil"));

        // e o diretório público (community_cards) foi sincronizado
        mockMvc.perform(get("https://quilombo.localhost/api/v1/communities"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.slug == 'kalunga')].shortDescription")
                        .value("O maior quilombo do Brasil"));
    }

    @Test
    void second_put_overwrites_and_null_clears_a_field() throws Exception {
        var jwt = login();
        putCard(jwt, "{\"imageUrl\":\"/uploads/a.webp\",\"shortDescription\":\"primeira\"}");

        putCard(jwt, "{\"shortDescription\":\"segunda\"}");

        mockMvc.perform(get(CARD_URL).header("Authorization", "Bearer " + jwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.imageUrl").doesNotExist()) // null limpou
                .andExpect(jsonPath("$.data.shortDescription").value("segunda"));
    }

    @Test
    void without_token_is_401() throws Exception {
        mockMvc.perform(get(CARD_URL))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Sessão inválida"));
    }

    @Test
    void token_of_another_tenants_subdomain_is_403() throws Exception {
        mockMvc.perform(get("https://palmares.quilombo.localhost/api/v1/admin/card")
                        .header("Authorization", "Bearer " + login()))
                .andExpect(status().isForbidden());
    }

    @Test
    void admin_removed_from_allowlist_loses_write_access() throws Exception {
        var jwt = login();
        try (var owner = DriverManager.getConnection(jdbcUrl, ownerUser, ownerPassword);
             var st = owner.createStatement()) {
            st.execute("DELETE FROM admins WHERE id = " + adminId);
        }

        mockMvc.perform(put(CARD_URL)
                        .header("Authorization", "Bearer " + jwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"shortDescription\":\"não deve gravar\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void image_url_longer_than_500_chars_is_rejected() throws Exception {
        mockMvc.perform(put(CARD_URL)
                        .header("Authorization", "Bearer " + login())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"imageUrl\":\"/" + "x".repeat(500) + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("imageUrl"));
    }

    private void putCard(String jwt, String body) throws Exception {
        mockMvc.perform(put(CARD_URL)
                        .header("Authorization", "Bearer " + jwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk());
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
