package com.quilombo.security;

import com.quilombo.auth.AuthService;
import com.quilombo.config.AppProperties;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class OAuth2AuthenticationSuccessHandler implements AuthenticationSuccessHandler {

    private final AuthService authService;
    private final AppProperties appProperties;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        var oauth2User = (OAuth2User) authentication.getPrincipal();
        var email = (String) oauth2User.getAttributes().get("email");
        var name  = (String) oauth2User.getAttributes().get("name");

        // Emite um código opaco de uso único; o JWT não trafega na URL.
        // O frontend troca o código por um JWT em POST /api/v1/auth/token.
        var code = authService.issueLoginCode(email, name);

        var redirectUrl = UriComponentsBuilder
                .fromUriString("https://" + appProperties.baseDomain())
                .path("/auth/callback")
                .queryParam("code", code)
                .build()
                .toUriString();

        response.sendRedirect(redirectUrl);
    }
}
