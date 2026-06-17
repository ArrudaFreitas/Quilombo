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

import java.sql.SQLException;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Fio completo HTTP do login: ao logar direto num subdomínio, o idToken só vira sessão
 * se o e-mail estiver na allowlist daquela comunidade (tenant do Host, busca tenant-scoped).
 * Na raiz (ápice) o login é tenant-agnóstico — estabelece só a identidade.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@ActiveProfiles("dev")
class AuthAllowlistWebIntegrationTest {

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

    @BeforeEach
    void seed() throws SQLException {
        TestDatabase.wipe(jdbcUrl, ownerUser, ownerPassword);
        var kalunga = communities.save(community("kalunga", "Kalunga", "GO"));
        communities.save(community("palmares", "Palmares", "AL"));

        TenantContext.setCommunityId(kalunga.getId());
        var admin = new Admin();
        admin.setEmailHash(emailHasher.hash(ADMIN_EMAIL));
        admins.save(admin);
        TenantContext.clear(); // o interceptor da requisição resolve o tenant
    }

    @Test
    void exchanges_on_the_allowed_subdomain() throws Exception {
        mockMvc.perform(post("https://kalunga.quilombo.localhost/api/v1/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idToken\":\"" + ADMIN_EMAIL + "|Maria\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.token").isNotEmpty());
    }

    @Test
    void rejects_on_a_subdomain_whose_allowlist_lacks_the_email() throws Exception {
        mockMvc.perform(post("https://palmares.quilombo.localhost/api/v1/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idToken\":\"" + ADMIN_EMAIL + "|Maria\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.detail").value("E-mail não autorizado para esta comunidade"));
    }

    @Test
    void on_the_root_domain_establishes_identity_without_checking_any_allowlist() throws Exception {
        // o login no ápice é tenant-agnóstico: verifica o idToken e devolve a identidade
        // (cookie do domínio-pai), sem tenant e sem token de sessão no corpo. A allowlist
        // só é consultada no /refresh, já no subdomínio.
        mockMvc.perform(post("https://quilombo.localhost/api/v1/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idToken\":\"" + ADMIN_EMAIL + "|Maria\"}"))
                .andExpect(status().isOk())
                .andExpect(cookie().exists(AuthCookies.IDENTITY_COOKIE))
                .andExpect(jsonPath("$.data.token").doesNotExist());
    }

    private static Community community(String slug, String name, String location) {
        var community = new Community();
        community.setSlug(slug);
        community.setName(name);
        community.setLocation(location);
        return community;
    }
}
