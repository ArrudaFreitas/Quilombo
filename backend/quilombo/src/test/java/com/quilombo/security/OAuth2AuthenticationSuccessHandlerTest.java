package com.quilombo.security;

import com.quilombo.auth.AuthService;
import com.quilombo.config.AppProperties;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class OAuth2AuthenticationSuccessHandlerTest {

    @Test
    void redirects_with_one_time_code_and_never_the_token() throws Exception {
        var authService = mock(AuthService.class);
        when(authService.issueLoginCode("admin@example.com", "Admin Quilombo"))
                .thenReturn("CODE-123");

        var appProperties = new AppProperties("quilombo.localhost", null, null, null);
        var handler = new OAuth2AuthenticationSuccessHandler(authService, appProperties);

        var principal = new DefaultOAuth2User(
                List.of(new SimpleGrantedAuthority("ROLE_USER")),
                Map.of("email", "admin@example.com", "name", "Admin Quilombo"),
                "email");
        var authentication = mock(Authentication.class);
        when(authentication.getPrincipal()).thenReturn(principal);

        var response = mock(HttpServletResponse.class);
        handler.onAuthenticationSuccess(mock(HttpServletRequest.class), response, authentication);

        var redirect = ArgumentCaptor.forClass(String.class);
        verify(response).sendRedirect(redirect.capture());

        var url = redirect.getValue();
        assertThat(url).contains("https://quilombo.localhost/auth/callback");
        assertThat(url).contains("code=CODE-123");
        assertThat(url).doesNotContain("token=");
    }
}
