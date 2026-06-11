package com.quilombo.security;

import com.quilombo.config.AppProperties;
import com.quilombo.config.AppProperties.JwtProperties;
import com.quilombo.tenant.TenantContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

class JwtAuthenticationFilterTest {

    private final JwtService jwtService = new JwtService(new AppProperties(
            null, null, null, new JwtProperties("test-secret-key-for-junit-tests-only-not-production", 1), null));
    private final JwtAuthenticationFilter filter = new JwtAuthenticationFilter(jwtService);

    @AfterEach
    void cleanup() {
        SecurityContextHolder.clearContext();
        TenantContext.clear();
    }

    @Test
    void valid_token_authenticates_and_scopes_the_tenant_during_the_request() throws Exception {
        var token = jwtService.generateToken("17", Map.of("communityId", 42L, "name", "Maria"));
        var request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);

        var tenantDuringChain = new AtomicReference<Optional<Long>>();
        filter.doFilter(request, new MockHttpServletResponse(), (req, res) -> {
            tenantDuringChain.set(TenantContext.getCommunityId());
            assertThat(SecurityContextHolder.getContext().getAuthentication().getName())
                    .isEqualTo("17");
        });

        assertThat(tenantDuringChain.get()).contains(42L);
        // limpo no finally do filtro — nada vaza para a próxima requisição da thread
        assertThat(TenantContext.getCommunityId()).isEmpty();
    }

    @Test
    void invalid_token_leaves_request_unauthenticated() throws Exception {
        var request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer token-invalido");

        filter.doFilter(request, new MockHttpServletResponse(), (req, res) -> {
            assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
            assertThat(TenantContext.getCommunityId()).isEmpty();
        });
    }

    @Test
    void request_without_bearer_passes_through_untouched() throws Exception {
        filter.doFilter(new MockHttpServletRequest(), new MockHttpServletResponse(), (req, res) -> {
            assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
            assertThat(TenantContext.getCommunityId()).isEmpty();
        });
    }
}
