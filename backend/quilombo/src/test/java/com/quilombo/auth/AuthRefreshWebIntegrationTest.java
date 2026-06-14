package com.quilombo.auth;

import com.quilombo.TestDatabase;
import com.quilombo.TestcontainersConfiguration;
import com.quilombo.community.Community;
import com.quilombo.community.CommunityRepository;
import com.quilombo.tenant.TenantContext;
import jakarta.servlet.http.Cookie;
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
import org.springframework.test.web.servlet.MvcResult;

import java.sql.SQLException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Fio completo HTTP da sessão longa: o cookie httpOnly emitido no login é
 * rotacionado no /refresh e expirado no /logout — sempre no subdomínio do tenant.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@ActiveProfiles("dev")
class AuthRefreshWebIntegrationTest {

    private static final String ADMIN_EMAIL = "admin@kalunga.org";
    private static final String BASE_URL = "https://kalunga.quilombo.localhost/api/v1/auth";

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
        var kalunga = communities.save(community());

        TenantContext.setCommunityId(kalunga.getId());
        var admin = new Admin();
        admin.setEmailHash(emailHasher.hash(ADMIN_EMAIL));
        admins.save(admin);
        TenantContext.clear();
    }

    @Test
    void login_sets_the_refresh_cookie_and_refresh_rotates_it() throws Exception {
        var loginCookie = login().getResponse().getCookie(AuthCookies.REFRESH_COOKIE);
        assertThat(loginCookie).isNotNull();
        assertThat(loginCookie.isHttpOnly()).isTrue();
        assertThat(loginCookie.getPath()).isEqualTo("/api/v1/auth");

        var refreshResult = mockMvc.perform(post(BASE_URL + "/refresh")
                        .cookie(loginCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.token").isNotEmpty())
                .andReturn();

        var rotated = refreshResult.getResponse().getCookie(AuthCookies.REFRESH_COOKIE);
        assertThat(rotated).isNotNull();
        assertThat(rotated.getValue()).isNotEqualTo(loginCookie.getValue());

        // o cookie antigo foi consumido na rotação — reuso é 401
        mockMvc.perform(post(BASE_URL + "/refresh").cookie(loginCookie))
                .andExpect(status().isUnauthorized());

        // o rotacionado segue válido
        mockMvc.perform(post(BASE_URL + "/refresh").cookie(rotated))
                .andExpect(status().isOk());
    }

    @Test
    void refresh_without_cookie_is_401() throws Exception {
        mockMvc.perform(post(BASE_URL + "/refresh"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Refresh token inválido ou expirado"));
    }

    @Test
    void logout_expires_the_cookie_and_kills_the_session() throws Exception {
        var loginCookie = login().getResponse().getCookie(AuthCookies.REFRESH_COOKIE);

        var logoutResult = mockMvc.perform(post(BASE_URL + "/logout")
                        .cookie(loginCookie))
                .andExpect(status().isOk())
                .andReturn();
        var cleared = logoutResult.getResponse().getCookie(AuthCookies.REFRESH_COOKIE);
        assertThat(cleared).isNotNull();
        assertThat(cleared.getMaxAge()).isZero();

        mockMvc.perform(post(BASE_URL + "/refresh").cookie(loginCookie))
                .andExpect(status().isUnauthorized());
    }

    private MvcResult login() throws Exception {
        return mockMvc.perform(post(BASE_URL + "/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idToken\":\"" + ADMIN_EMAIL + "|Maria\"}"))
                .andExpect(status().isOk())
                .andReturn();
    }

    private static Community community() {
        var community = new Community();
        community.setSlug("kalunga");
        community.setName("Kalunga");
        community.setLocation("GO");
        return community;
    }
}
