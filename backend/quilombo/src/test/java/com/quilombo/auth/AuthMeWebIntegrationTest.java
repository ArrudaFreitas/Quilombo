package com.quilombo.auth;

import com.quilombo.TestDatabase;
import com.quilombo.TestcontainersConfiguration;
import com.quilombo.community.Community;
import com.quilombo.community.CommunityRepository;
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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Fio completo da sessão: login (troca do código) seguido de {@code GET /auth/me}
 * com o Bearer — pipeline real filtro JWT → tenant do claim → cross-check do
 * subdomínio → allowlist revalidada no banco.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@ActiveProfiles("dev")
class AuthMeWebIntegrationTest {

    private static final String ADMIN_EMAIL = "admin@kalunga.org";

    @Autowired
    MockMvc mockMvc;


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

    Long kalungaId;
    Long adminId;

    @BeforeEach
    void seed() throws SQLException {
        TestDatabase.wipe(jdbcUrl, ownerUser, ownerPassword);
        kalungaId = communities.save(community("kalunga", "Kalunga", "GO")).getId();
        communities.save(community("palmares", "Palmares", "AL"));

        TenantContext.setCommunityId(kalungaId);
        var admin = new Admin();
        admin.setEmailHash(emailHasher.hash(ADMIN_EMAIL));
        adminId = admins.save(admin).getId();
        TenantContext.clear();
    }

    @Test
    void me_returns_current_session_on_the_tokens_subdomain() throws Exception {
        var jwt = login();

        mockMvc.perform(get("https://kalunga.quilombo.localhost/api/v1/auth/me")
                        .header("Authorization", "Bearer " + jwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(adminId))
                .andExpect(jsonPath("$.data.name").value("Maria"))
                .andExpect(jsonPath("$.data.communitySlug").value("kalunga"));
    }

    @Test
    void me_on_another_tenants_subdomain_is_403() throws Exception {
        var jwt = login();

        // cross-check do interceptor: claim do token (kalunga) × subdomínio (palmares)
        mockMvc.perform(get("https://palmares.quilombo.localhost/api/v1/auth/me")
                        .header("Authorization", "Bearer " + jwt))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.detail").value("Tenant do token diverge do subdomínio"));
    }

    @Test
    void me_without_token_is_401() throws Exception {
        mockMvc.perform(get("https://kalunga.quilombo.localhost/api/v1/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Sessão inválida"));
    }

    @Test
    void me_after_admin_removed_from_allowlist_is_401() throws Exception {
        var jwt = login();

        // remover da allowlist revoga a sessão mesmo com JWT ainda válido
        try (var owner = DriverManager.getConnection(jdbcUrl, ownerUser, ownerPassword);
             var st = owner.createStatement()) {
            st.execute("DELETE FROM admins WHERE id = " + adminId);
        }

        mockMvc.perform(get("https://kalunga.quilombo.localhost/api/v1/auth/me")
                        .header("Authorization", "Bearer " + jwt))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Sessão inválida"));
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
