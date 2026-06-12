package com.quilombo.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Login de desenvolvimento (profile dev): o endpoint emite o mesmo código
 * opaco do callback OAuth, e o resto do fluxo permanece o real — a troca no
 * tenant continua decidida pela allowlist de admins.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@ActiveProfiles("dev")
class DevAuthLoginWebIntegrationTest {

    private static final String ADMIN_EMAIL = "admin.kalunga@example.com";
    private static final String ROOT_URL = "https://quilombo.localhost/api/v1/auth";
    private static final String TENANT_URL = "https://kalunga.quilombo.localhost/api/v1/auth";
    private static final String OTHER_TENANT_URL = "https://palmares.quilombo.localhost/api/v1/auth";

    @Autowired
    MockMvc mockMvc;

    @Autowired
    CommunityRepository communities;

    @Autowired
    AdminRepository admins;

    @Autowired
    EmailHasher emailHasher;

    /** Jackson 2 local só para ler as respostas (Boot 4 não expõe esse bean). */
    final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${spring.datasource.url}")
    String jdbcUrl;

    @Value("${spring.flyway.user}")
    String ownerUser;

    @Value("${spring.flyway.password}")
    String ownerPassword;

    @BeforeEach
    void seed() throws SQLException {
        TestDatabase.wipe(jdbcUrl, ownerUser, ownerPassword);
        var kalunga = communities.save(community("kalunga", "Kalunga"));
        communities.save(community("palmares", "Palmares"));

        TenantContext.setCommunityId(kalunga.getId());
        var admin = new Admin();
        admin.setEmailHash(emailHasher.hash(ADMIN_EMAIL));
        admins.save(admin);
        TenantContext.clear();
    }

    @Test
    void dev_login_code_completes_the_real_exchange_flow() throws Exception {
        var code = devLogin(ADMIN_EMAIL);

        var tokenBody = mockMvc.perform(post(TENANT_URL + "/token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"" + code + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.token").isNotEmpty())
                .andReturn().getResponse().getContentAsString();
        var token = objectMapper.readTree(tokenBody).at("/data/token").asText();

        mockMvc.perform(get(TENANT_URL + "/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.communitySlug").value("kalunga"))
                .andExpect(jsonPath("$.data.name").value("admin.kalunga"));
    }

    @Test
    void allowlist_still_rules_the_exchange() throws Exception {
        // e-mail que não é admin de palmares: código emitido, troca recusada lá
        var code = devLogin(ADMIN_EMAIL);

        mockMvc.perform(post(OTHER_TENANT_URL + "/token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"" + code + "\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void rejects_malformed_email() throws Exception {
        mockMvc.perform(post(ROOT_URL + "/dev-login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"nao-e-email\"}"))
                .andExpect(status().isBadRequest());
    }

    private String devLogin(String email) throws Exception {
        var body = mockMvc.perform(post(ROOT_URL + "/dev-login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.code").isNotEmpty())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).at("/data/code").asText();
    }

    private static Community community(String slug, String name) {
        var community = new Community();
        community.setSlug(slug);
        community.setName(name);
        community.setLocation("Brasil");
        return community;
    }
}
