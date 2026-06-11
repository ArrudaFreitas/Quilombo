package com.quilombo.tenant;

import com.quilombo.TestDatabase;
import com.quilombo.TestcontainersConfiguration;
import com.quilombo.community.Community;
import com.quilombo.community.CommunityRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.sql.SQLException;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Prova o fio completo da resolução de tenant: o {@link TenantInterceptor} está
 * registrado no MVC ({@link TenantWebConfiguration}) e resolve o subdomínio do
 * Host da requisição HTTP real (MockMvc com URL absoluta).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@ActiveProfiles("dev")
class TenantResolutionWebIntegrationTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    CommunityRepository communities;

    @Value("${spring.datasource.url}")
    String jdbcUrl;

    @Value("${spring.flyway.user}")
    String ownerUser;

    @Value("${spring.flyway.password}")
    String ownerPassword;

    @BeforeEach
    void seed() throws SQLException {
        TestDatabase.wipe(jdbcUrl, ownerUser, ownerPassword);
        var community = new Community();
        community.setSlug("kalunga");
        community.setName("Kalunga");
        community.setLocation("GO");
        communities.save(community);
    }

    @Test
    void unknown_subdomain_returns_404_before_reaching_the_controller() throws Exception {
        mockMvc.perform(post("https://fantasma.quilombo.localhost/api/v1/auth/token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"qualquer\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Comunidade não encontrada: fantasma"));
    }

    @Test
    void known_subdomain_passes_tenant_resolution_and_reaches_the_controller() throws Exception {
        // 401 (código de login inválido) = o interceptor deixou a requisição passar
        mockMvc.perform(post("https://kalunga.quilombo.localhost/api/v1/auth/token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"inexistente\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void root_domain_passes_without_tenant() throws Exception {
        // chega ao controller sem tenant; a troca exige subdomínio -> 400
        mockMvc.perform(post("https://quilombo.localhost/api/v1/auth/token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"inexistente\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("A troca do código exige o subdomínio da comunidade"));
    }
}
