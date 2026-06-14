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
 * Round-trip real contra PostgreSQL (Testcontainers) do login centralizado por idToken.
 * O {@code GoogleTokenVerifier} é stubado em {@link TestcontainersConfiguration} (sem rede):
 * o "idToken" sintético é {@code "email|nome"}. A identidade é tenant-agnóstica; a autorização
 * (allowlist por comunidade, {@code @TenantId} + RLS) é resolvida do tenant atual.
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
    void on_a_subdomain_establishes_identity_and_issues_the_tenant_session() {
        TenantContext.setCommunityId(communityA);
        var result = authService.loginWithGoogle(ID_TOKEN);

        assertThat(result.identityToken()).isNotBlank();        // identidade (cookie do pai)
        assertThat(result.tokens()).isNotNull();                // sessão do tenant também

        var claims = jwtService.parseToken(result.tokens().accessToken());
        assertThat(claims.getSubject()).isEqualTo(adminId.toString()); // sub = id do admin, sem PII
        assertThat(((Number) claims.get("communityId")).longValue()).isEqualTo(communityA);
        assertThat(claims.get("name")).isEqualTo("Maria");
        assertThat(result.tokens().refreshToken()).isNotBlank();
    }

    @Test
    void on_the_apex_establishes_identity_only() {
        TenantContext.clear(); // ápice: sem tenant
        var result = authService.loginWithGoogle(ID_TOKEN);

        assertThat(result.identityToken()).isNotBlank();
        assertThat(result.tokens()).isNull(); // sem tenant → sem sessão por-tenant
    }

    @Test
    void rejects_an_invalid_id_token() {
        TenantContext.setCommunityId(communityA);
        // sem "@" o verificador stub simula assinatura/aud/iss inválidos (igual ao real → 401)
        assertThatThrownBy(() -> authService.loginWithGoogle("token-invalido"))
                .isInstanceOf(InvalidGoogleTokenException.class);
    }

    @Test
    void rejects_email_outside_the_tenants_allowlist_on_direct_subdomain_login() {
        // admin é de kalunga; em palmares a allowlist (tenant-scoped) não o contém
        TenantContext.setCommunityId(communityB);
        assertThatThrownBy(() -> authService.loginWithGoogle(ID_TOKEN))
                .isInstanceOf(EmailNotAllowedException.class);

        TenantContext.setCommunityId(communityA);
        assertThat(authService.loginWithGoogle(ID_TOKEN).tokens().accessToken()).isNotBlank();
    }

    @Test
    void bootstraps_a_tenant_session_from_the_identity_cookie() {
        // identidade obtida no ápice (sem tenant)
        var identity = authService.loginWithGoogle(ID_TOKEN).identityToken();

        // num subdomínio onde o e-mail é admin: o refresh cunha a sessão (sem refresh por-tenant)
        TenantContext.setCommunityId(communityA);
        var tokens = authService.refresh(null, identity);
        var claims = jwtService.parseToken(tokens.accessToken());
        assertThat(claims.getSubject()).isEqualTo(adminId.toString());
        assertThat(((Number) claims.get("communityId")).longValue()).isEqualTo(communityA);

        // num subdomínio onde NÃO é admin: a allowlist recusa (403)
        TenantContext.setCommunityId(communityB);
        assertThatThrownBy(() -> authService.refresh(null, identity))
                .isInstanceOf(EmailNotAllowedException.class);
    }

    @Test
    void refresh_rotates_the_per_tenant_session_exactly_once() {
        TenantContext.setCommunityId(communityA);
        var first = authService.loginWithGoogle(ID_TOKEN).tokens();

        var second = authService.refresh(first.refreshToken(), null);
        assertThat(second.accessToken()).isNotBlank();
        assertThat(second.refreshToken()).isNotEqualTo(first.refreshToken());

        var claims = jwtService.parseToken(second.accessToken());
        assertThat(claims.getSubject()).isEqualTo(adminId.toString());
        assertThat(claims.get("name")).isEqualTo("Maria");

        // o refresh antigo foi consumido — sem identidade, o reuso falha
        assertThatThrownBy(() -> authService.refresh(first.refreshToken(), null))
                .isInstanceOf(InvalidRefreshTokenException.class);
    }

    @Test
    void refresh_requires_tenant_and_rejects_unknown_blank_and_expired_tokens() {
        TenantContext.clear();
        assertThatThrownBy(() -> authService.refresh("qualquer", null))
                .isInstanceOf(TenantRequiredException.class);

        TenantContext.setCommunityId(communityA);
        assertThatThrownBy(() -> authService.refresh(null, null))
                .isInstanceOf(InvalidRefreshTokenException.class);
        assertThatThrownBy(() -> authService.refresh("desconhecido", null))
                .isInstanceOf(InvalidRefreshTokenException.class);

        var tokens = authService.loginWithGoogle(ID_TOKEN).tokens();
        var stored = refreshTokens.findAll().getFirst();
        stored.setExpiresAt(Instant.now().minusSeconds(120));
        refreshTokens.save(stored);
        assertThatThrownBy(() -> authService.refresh(tokens.refreshToken(), null))
                .isInstanceOf(InvalidRefreshTokenException.class);
    }

    @Test
    void refresh_after_admin_removed_from_allowlist_is_rejected() throws SQLException {
        TenantContext.setCommunityId(communityA);
        var identity = authService.loginWithGoogle(ID_TOKEN).identityToken();
        var tokens = authService.refresh(null, identity);

        try (var owner = DriverManager.getConnection(jdbcUrl, ownerUser, ownerPassword);
             var st = owner.createStatement()) {
            st.execute("DELETE FROM admins WHERE id = " + adminId);
        }

        // ON DELETE CASCADE revogou o refresh por-tenant; e o bootstrap pela identidade
        // não encontra mais o admin na allowlist → recusado (403).
        assertThatThrownBy(() -> authService.refresh(tokens.refreshToken(), identity))
                .isInstanceOf(EmailNotAllowedException.class);
    }

    @Test
    void logout_revokes_the_per_tenant_session() {
        TenantContext.setCommunityId(communityA);
        var tokens = authService.loginWithGoogle(ID_TOKEN).tokens();

        authService.logout(tokens.refreshToken());

        assertThatThrownBy(() -> authService.refresh(tokens.refreshToken(), null))
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
