package com.quilombo.auth;

import com.quilombo.TestDatabase;
import com.quilombo.TestcontainersConfiguration;
import com.quilombo.community.Community;
import com.quilombo.community.CommunityRepository;
import com.quilombo.security.JwtService;
import com.quilombo.tenant.TenantContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.sql.DriverManager;
import java.sql.SQLException;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Round-trip real contra PostgreSQL (Testcontainers) do login por idToken do Google e da
 * gestão de sessão. O {@code GoogleTokenVerifier} é stubado em {@link TestcontainersConfiguration}
 * (sem rede): o "idToken" sintético é {@code "email|nome"}. A allowlist de admins
 * ({@code @TenantId} + RLS) é por tenant, resolvido do subdomínio.
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
@ActiveProfiles("dev")
class AuthGoogleLoginIntegrationTest {

    private static final String ADMIN_EMAIL = "admin@example.com";
    private static final String ID_TOKEN = ADMIN_EMAIL + "|Maria";

    @Autowired
    AuthService authService;

    @Autowired
    RefreshTokenRepository refreshTokens;

    @Autowired
    AdminRepository admins;

    @Autowired
    CommunityRepository communities;

    @Autowired
    EmailHasher emailHasher;

    @Autowired
    JwtService jwtService;

    @Value("${spring.datasource.url}")
    String jdbcUrl;

    @Value("${spring.flyway.user}")
    String ownerUser;

    @Value("${spring.flyway.password}")
    String ownerPassword;

    Long communityA;
    Long communityB;
    Long adminId;

    @BeforeEach
    void seed() throws SQLException {
        TestDatabase.wipe(jdbcUrl, ownerUser, ownerPassword);
        communityA = communities.save(community("kalunga", "Kalunga", "GO")).getId();
        communityB = communities.save(community("palmares", "Palmares", "AL")).getId();

        TenantContext.setCommunityId(communityA);
        var admin = new Admin();
        admin.setEmailHash(emailHasher.hash(ADMIN_EMAIL));
        adminId = admins.save(admin).getId();
        TenantContext.clear();
    }

    @AfterEach
    void clearTenant() {
        TenantContext.clear();
    }

    @Test
    void logs_in_with_google_and_issues_jwt_bound_to_the_tenant() {
        TenantContext.setCommunityId(communityA);
        var tokens = authService.loginWithGoogle(ID_TOKEN);

        var claims = jwtService.parseToken(tokens.accessToken());
        assertThat(claims.getSubject()).isEqualTo(adminId.toString()); // sub = id do admin, sem PII
        assertThat(((Number) claims.get("communityId")).longValue()).isEqualTo(communityA);
        assertThat(claims.get("name")).isEqualTo("Maria");          // nome veio do idToken verificado
        assertThat(tokens.refreshToken()).isNotBlank();             // sessão longa emitida junto
    }

    @Test
    void rejects_an_invalid_id_token() {
        TenantContext.setCommunityId(communityA);
        // sem "@" o verificador stub simula assinatura/aud/iss inválidos (igual ao real → 401)
        assertThatThrownBy(() -> authService.loginWithGoogle("token-invalido"))
                .isInstanceOf(InvalidGoogleTokenException.class);
    }

    @Test
    void rejects_email_outside_the_tenants_allowlist() {
        // admin é de kalunga; em palmares a allowlist (tenant-scoped) não o contém
        TenantContext.setCommunityId(communityB);
        assertThatThrownBy(() -> authService.loginWithGoogle(ID_TOKEN))
                .isInstanceOf(EmailNotAllowedException.class);

        // no subdomínio certo o login funciona
        TenantContext.setCommunityId(communityA);
        assertThat(authService.loginWithGoogle(ID_TOKEN).accessToken()).isNotBlank();
    }

    @Test
    void requires_a_tenant_from_the_subdomain() {
        TenantContext.clear();
        assertThatThrownBy(() -> authService.loginWithGoogle(ID_TOKEN))
                .isInstanceOf(TenantRequiredException.class);
    }

    @Test
    void refresh_rotates_the_long_session_exactly_once() {
        TenantContext.setCommunityId(communityA);
        var first = authService.loginWithGoogle(ID_TOKEN);

        var second = authService.refresh(first.refreshToken());
        assertThat(second.accessToken()).isNotBlank();
        assertThat(second.refreshToken()).isNotEqualTo(first.refreshToken());

        // claims re-cunhados na rotação
        var claims = jwtService.parseToken(second.accessToken());
        assertThat(claims.getSubject()).isEqualTo(adminId.toString());
        assertThat(claims.get("name")).isEqualTo("Maria");

        // o refresh antigo foi consumido — reuso falha
        assertThatThrownBy(() -> authService.refresh(first.refreshToken()))
                .isInstanceOf(InvalidRefreshTokenException.class);
    }

    @Test
    void refresh_requires_tenant_and_rejects_unknown_blank_and_expired_tokens() {
        TenantContext.clear();
        assertThatThrownBy(() -> authService.refresh("qualquer"))
                .isInstanceOf(TenantRequiredException.class);

        TenantContext.setCommunityId(communityA);
        assertThatThrownBy(() -> authService.refresh(null))
                .isInstanceOf(InvalidRefreshTokenException.class);
        assertThatThrownBy(() -> authService.refresh("desconhecido"))
                .isInstanceOf(InvalidRefreshTokenException.class);

        var tokens = authService.loginWithGoogle(ID_TOKEN);
        var stored = refreshTokens.findAll().getFirst();
        stored.setExpiresAt(Instant.now().minusSeconds(120));
        refreshTokens.save(stored);
        assertThatThrownBy(() -> authService.refresh(tokens.refreshToken()))
                .isInstanceOf(InvalidRefreshTokenException.class);
    }

    @Test
    void refresh_after_admin_removed_from_allowlist_is_rejected() throws SQLException {
        TenantContext.setCommunityId(communityA);
        var tokens = authService.loginWithGoogle(ID_TOKEN);

        try (var owner = DriverManager.getConnection(jdbcUrl, ownerUser, ownerPassword);
             var st = owner.createStatement()) {
            st.execute("DELETE FROM admins WHERE id = " + adminId);
        }

        // ON DELETE CASCADE já revogou a sessão longa junto com o admin
        assertThatThrownBy(() -> authService.refresh(tokens.refreshToken()))
                .isInstanceOf(InvalidRefreshTokenException.class);
    }

    @Test
    void logout_revokes_the_long_session() {
        TenantContext.setCommunityId(communityA);
        var tokens = authService.loginWithGoogle(ID_TOKEN);

        authService.logout(tokens.refreshToken());

        assertThatThrownBy(() -> authService.refresh(tokens.refreshToken()))
                .isInstanceOf(InvalidRefreshTokenException.class);
        authService.logout(tokens.refreshToken()); // idempotente
    }

    private static Community community(String slug, String name, String location) {
        var community = new Community();
        community.setSlug(slug);
        community.setName(name);
        community.setLocation(location);
        return community;
    }
}
