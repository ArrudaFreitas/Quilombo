package com.quilombo.security;

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
import java.util.Map;

@Component
@RequiredArgsConstructor
public class OAuth2AuthenticationSuccessHandler implements AuthenticationSuccessHandler {

    private final JwtService jwtService;
    private final AppProperties appProperties;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        var oauth2User = (OAuth2User) authentication.getPrincipal();
        var email = (String) oauth2User.getAttributes().get("email");
        var name  = (String) oauth2User.getAttributes().get("name");

        var token = jwtService.generateToken(email, Map.of(
                "name", name != null ? name : ""));

        // frontend recebe o token via query param e o armazena localmente
        var redirectUrl = UriComponentsBuilder
                .fromUriString("https://" + appProperties.baseDomain())
                .path("/auth/callback")
                .queryParam("token", token)
                .build()
                .toUriString();

        response.sendRedirect(redirectUrl);
    }
}
