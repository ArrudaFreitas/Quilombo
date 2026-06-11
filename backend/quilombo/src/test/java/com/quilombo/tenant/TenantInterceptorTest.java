package com.quilombo.tenant;

import com.quilombo.community.Community;
import com.quilombo.community.CommunityRepository;
import com.quilombo.config.AppProperties;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class TenantInterceptorTest {

    private static final String BASE_DOMAIN = "quilombo.localhost";

    private final CommunityRepository repository = mock(CommunityRepository.class);
    private final TenantInterceptor interceptor = new TenantInterceptor(
            provider(repository), new AppProperties(BASE_DOMAIN, null, null, null, null));

    @SuppressWarnings("unchecked")
    private static ObjectProvider<CommunityRepository> provider(CommunityRepository repository) {
        ObjectProvider<CommunityRepository> provider = mock(ObjectProvider.class);
        when(provider.getObject()).thenReturn(repository);
        return provider;
    }

    @AfterEach
    void clearContext() {
        TenantContext.clear();
    }

    @ParameterizedTest
    @CsvSource(nullValues = "NULL", value = {
            "kalunga.quilombo.localhost,          kalunga",
            "KALUNGA.QUILOMBO.LOCALHOST,          kalunga",
            "quilombo.localhost,                  NULL",
            "a.b.quilombo.localhost,              NULL",
            "localhost,                           NULL",
            "outrodominio.com,                    NULL",
            "xquilombo.localhost,                 NULL",
    })
    void extracts_slug_only_from_single_level_subdomain(String host, String expected) {
        assertThat(TenantInterceptor.slugFromHost(host, BASE_DOMAIN)).isEqualTo(expected);
    }

    @Test
    void resolves_subdomain_and_sets_tenant_context() {
        var community = new Community();
        community.setId(42L);
        when(repository.findBySlug("kalunga")).thenReturn(Optional.of(community));

        assertThat(interceptor.preHandle(request("kalunga.quilombo.localhost"),
                new MockHttpServletResponse(), new Object())).isTrue();

        assertThat(TenantContext.getCommunityId()).contains(42L);
    }

    @Test
    void unknown_slug_results_in_404() {
        when(repository.findBySlug(anyString())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> interceptor.preHandle(request("fantasma.quilombo.localhost"),
                new MockHttpServletResponse(), new Object()))
                .isInstanceOf(TenantNotFoundException.class);

        assertThat(TenantContext.getCommunityId()).isEmpty();
    }

    @Test
    void root_domain_passes_without_tenant_and_without_lookup() {
        assertThat(interceptor.preHandle(request("quilombo.localhost"),
                new MockHttpServletResponse(), new Object())).isTrue();

        assertThat(TenantContext.getCommunityId()).isEmpty();
        verifyNoInteractions(repository);
    }

    @Test
    void cross_checks_when_jwt_already_resolved_the_tenant() {
        var community = new Community();
        community.setId(42L);
        when(repository.findBySlug("kalunga")).thenReturn(Optional.of(community));

        // tenant do JWT (filtro) igual ao do subdomínio: passa e não sobrescreve
        TenantContext.setCommunityId(42L);
        assertThat(interceptor.preHandle(request("kalunga.quilombo.localhost"),
                new MockHttpServletResponse(), new Object())).isTrue();
        assertThat(TenantContext.getCommunityId()).contains(42L);

        // tenant do JWT divergente do subdomínio: 403
        TenantContext.setCommunityId(7L);
        assertThatThrownBy(() -> interceptor.preHandle(request("kalunga.quilombo.localhost"),
                new MockHttpServletResponse(), new Object()))
                .isInstanceOf(TenantMismatchException.class);
    }

    @Test
    void after_completion_clears_the_context() {
        TenantContext.setCommunityId(7L);

        interceptor.afterCompletion(request("kalunga.quilombo.localhost"),
                new MockHttpServletResponse(), new Object(), null);

        assertThat(TenantContext.getCommunityId()).isEmpty();
    }

    private static MockHttpServletRequest request(String serverName) {
        var request = new MockHttpServletRequest();
        request.setServerName(serverName);
        return request;
    }
}
