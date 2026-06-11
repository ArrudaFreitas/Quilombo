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
 * Round-trip real contra PostgreSQL (Testcontainers) do fluxo completo:
 * código emitido no callback (sem tenant) e trocado por JWT no subdomínio da
 * comunidade, onde a allowlist de admins ({@code @TenantId} + RLS) decide.
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
@ActiveProfiles("dev")
class AuthTokenExchangeIntegrationTest {

    private static final String ADMIN_EMAIL = "admin@example.com";

    @Autowired
    AuthService authService;

    @Autowired
    LoginCodeRepository loginCodes;

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
        cleanAsOwner();
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
    void exchanges_code_for_jwt_bound_to_the_tenant_exactly_once() {
        var code = authService.issueLoginCode(ADMIN_EMAIL, "Maria");

        TenantContext.setCommunityId(communityA);
        var tokens = authService.exchangeCodeForToken(code);

        var claims = jwtService.parseToken(tokens.accessToken());
        assertThat(claims.getSubject()).isEqualTo(adminId.toString()); // sem PII
        assertThat(((Number) claims.get("communityId")).longValue()).isEqualTo(communityA);
        assertThat(claims.get("name")).isEqualTo("Maria");
        assertThat(tokens.refreshToken()).isNotBlank(); // sessão longa emitida junto

        assertThat(loginCodes.count()).isZero(); // uso único: consumido na troca
        assertThatThrownBy(() -> authService.exchangeCodeForToken(code))
                .isInstanceOf(InvalidLoginCodeException.class);
    }

    @Test
    void refresh_rotates_the_long_session_exactly_once() {
        var code = authService.issueLoginCode(ADMIN_EMAIL, "Maria");
        TenantContext.setCommunityId(communityA);
        var first = authService.exchangeCodeForToken(code);

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

        var code = authService.issueLoginCode(ADMIN_EMAIL, "Maria");
        var tokens = authService.exchangeCodeForToken(code);
        var stored = refreshTokens.findAll().getFirst();
        stored.setExpiresAt(Instant.now().minusSeconds(120));
        refreshTokens.save(stored);
        assertThatThrownBy(() -> authService.refresh(tokens.refreshToken()))
                .isInstanceOf(InvalidRefreshTokenException.class);
    }

    @Test
    void refresh_after_admin_removed_from_allowlist_is_rejected() throws SQLException {
        var code = authService.issueLoginCode(ADMIN_EMAIL, "Maria");
        TenantContext.setCommunityId(communityA);
        var tokens = authService.exchangeCodeForToken(code);

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
        var code = authService.issueLoginCode(ADMIN_EMAIL, "Maria");
        TenantContext.setCommunityId(communityA);
        var tokens = authService.exchangeCodeForToken(code);

        authService.logout(tokens.refreshToken());

        assertThatThrownBy(() -> authService.refresh(tokens.refreshToken()))
                .isInstanceOf(InvalidRefreshTokenException.class);
        authService.logout(tokens.refreshToken()); // idempotente
    }

    @Test
    void rejects_email_outside_the_tenants_allowlist_without_consuming_the_code() {
        var code = authService.issueLoginCode(ADMIN_EMAIL, "Maria");

        // admin é de kalunga; em palmares a allowlist (tenant-scoped) não o contém
        TenantContext.setCommunityId(communityB);
        assertThatThrownBy(() -> authService.exchangeCodeForToken(code))
                .isInstanceOf(EmailNotAllowedException.class);

        // o código não foi consumido: a troca no subdomínio certo ainda funciona
        TenantContext.setCommunityId(communityA);
        assertThat(authService.exchangeCodeForToken(code).accessToken()).isNotBlank();
    }

    @Test
    void requires_a_tenant_from_the_subdomain() {
        var code = authService.issueLoginCode(ADMIN_EMAIL, "Maria");

        TenantContext.clear();
        assertThatThrownBy(() -> authService.exchangeCodeForToken(code))
                .isInstanceOf(TenantRequiredException.class);
    }

    @Test
    void rejects_unknown_code() {
        TenantContext.setCommunityId(communityA);
        assertThatThrownBy(() -> authService.exchangeCodeForToken("codigo-inexistente"))
                .isInstanceOf(InvalidLoginCodeException.class);
    }

    @Test
    void rejects_expired_code_and_purges_it_on_next_issue() {
        var code = authService.issueLoginCode(ADMIN_EMAIL, "Maria");

        var stored = loginCodes.findAll().getFirst();
        stored.setExpiresAt(Instant.now().minusSeconds(120));
        loginCodes.save(stored);

        TenantContext.setCommunityId(communityA);
        assertThatThrownBy(() -> authService.exchangeCodeForToken(code))
                .isInstanceOf(InvalidLoginCodeException.class);

        // a limpeza oportunista remove o código expirado ao emitir o próximo
        authService.issueLoginCode("outra@example.com", "Outra");
        assertThat(loginCodes.findAll())
                .singleElement()
                .extracting(LoginCode::getExpiresAt)
                .matches(expiry -> expiry.isAfter(Instant.now()));
    }

    private static Community community(String slug, String name, String location) {
        var community = new Community();
        community.setSlug(slug);
        community.setName(name);
        community.setLocation(location);
        return community;
    }

    private void cleanAsOwner() throws SQLException {
        TestDatabase.wipe(jdbcUrl, ownerUser, ownerPassword);
    }
}
