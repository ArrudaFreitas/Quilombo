package com.quilombo.auth;

import com.quilombo.common.exception.GlobalExceptionHandler;
import com.quilombo.config.WebConfig;
import com.quilombo.security.JwtService;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.allOf;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// controllers= restringe o slice ao AuthController — sem isso o @WebMvcTest
// escaneia todos os @RestController e exigiria os services dos demais no contexto
@WebMvcTest(controllers = AuthController.class)
@Import({WebConfig.class, GlobalExceptionHandler.class, AuthController.class, AuthCookies.class})
@AutoConfigureMockMvc(addFilters = false)
class AuthControllerWebTest {

    @Autowired
    MockMvc mockMvc;

    @MockitoBean
    AuthService authService;

    // JwtAuthenticationFilter (Filter @Component) é detectado pelo slice e exige JwtService.
    @MockitoBean
    JwtService jwtService;

    @Test
    void valid_idToken_returns_access_token_in_envelope_and_refresh_in_cookie() throws Exception {
        given(authService.loginWithGoogle("good-token"))
                .willReturn(new TokenPair("jwt-xyz", "refresh-abc"));

        mockMvc.perform(post("/api/v1/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idToken\":\"good-token\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.token").value("jwt-xyz"))
                .andExpect(jsonPath("$.meta.timestamp").exists())
                // refresh nunca no corpo — só no cookie httpOnly restrito às rotas de auth
                .andExpect(content().string(not(containsString("refresh-abc"))))
                .andExpect(header().string("Set-Cookie", allOf(
                        containsString(AuthCookies.REFRESH_COOKIE + "=refresh-abc"),
                        containsString("HttpOnly"),
                        containsString("SameSite=Strict"),
                        containsString("Path=/api/v1/auth"))));
    }

    @Test
    void refresh_rotates_the_cookie_and_returns_a_new_access_token() throws Exception {
        given(authService.refresh("old-refresh"))
                .willReturn(new TokenPair("jwt-new", "refresh-new"));

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(new Cookie(AuthCookies.REFRESH_COOKIE, "old-refresh")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.token").value("jwt-new"))
                .andExpect(header().string("Set-Cookie",
                        containsString(AuthCookies.REFRESH_COOKIE + "=refresh-new")));
    }

    @Test
    void refresh_without_cookie_returns_401() throws Exception {
        given(authService.refresh(null)).willThrow(new InvalidRefreshTokenException());

        mockMvc.perform(post("/api/v1/auth/refresh"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Refresh token inválido ou expirado"));
    }

    @Test
    void logout_expires_the_cookie() throws Exception {
        mockMvc.perform(post("/api/v1/auth/logout")
                        .cookie(new Cookie(AuthCookies.REFRESH_COOKIE, "any")))
                .andExpect(status().isOk())
                .andExpect(header().string("Set-Cookie", allOf(
                        containsString(AuthCookies.REFRESH_COOKIE + "="),
                        containsString("Max-Age=0"))));

        verify(authService).logout("any");
    }

    @Test
    void blank_idToken_returns_validation_error() throws Exception {
        mockMvc.perform(post("/api/v1/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idToken\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("idToken"));
    }

    @Test
    void email_not_in_allowlist_returns_403_problem_detail() throws Exception {
        given(authService.loginWithGoogle("foreign-token"))
                .willThrow(new EmailNotAllowedException());

        mockMvc.perform(post("/api/v1/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idToken\":\"foreign-token\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.detail").value("E-mail não autorizado para esta comunidade"));
    }

    @Test
    void me_without_authentication_returns_401() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Sessão inválida"));
    }

    @Test
    void invalid_idToken_returns_401_problem_detail() throws Exception {
        given(authService.loginWithGoogle("bad-token"))
                .willThrow(new InvalidGoogleTokenException());

        mockMvc.perform(post("/api/v1/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idToken\":\"bad-token\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Token do Google inválido"));
    }
}
