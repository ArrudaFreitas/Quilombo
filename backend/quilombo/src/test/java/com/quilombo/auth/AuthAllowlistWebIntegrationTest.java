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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Fio completo HTTP do login: o código emitido no callback só vira JWT no
 * subdomínio cuja allowlist contém o e-mail — o tenant vem do Host (interceptor),
 * a busca de admins é tenant-scoped e a raiz (sem tenant) é 400.
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
        var code = authService.issueLoginCode(ADMIN_EMAIL, "Maria");

        mockMvc.perform(post("https://kalunga.quilombo.localhost/api/v1/auth/token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"" + code + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.token").isNotEmpty());
    }

    @Test
    void rejects_on_a_subdomain_whose_allowlist_lacks_the_email() throws Exception {
        var code = authService.issueLoginCode(ADMIN_EMAIL, "Maria");

        mockMvc.perform(post("https://palmares.quilombo.localhost/api/v1/auth/token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"" + code + "\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.detail").value("E-mail não autorizado para esta comunidade"));
    }

    @Test
    void rejects_on_the_root_domain_where_there_is_no_tenant() throws Exception {
        var code = authService.issueLoginCode(ADMIN_EMAIL, "Maria");

        mockMvc.perform(post("https://quilombo.localhost/api/v1/auth/token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"" + code + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("A troca do código exige o subdomínio da comunidade"));
    }

    private static Community community(String slug, String name, String location) {
        var community = new Community();
        community.setSlug(slug);
        community.setName(name);
        community.setLocation(location);
        return community;
    }
}
