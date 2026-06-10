package com.quilombo.auth;

import com.quilombo.common.exception.GlobalExceptionHandler;
import com.quilombo.config.WebConfig;
import com.quilombo.security.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest
@Import({WebConfig.class, GlobalExceptionHandler.class, AuthController.class})
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
    void valid_code_returns_token_in_envelope() throws Exception {
        given(authService.exchangeCodeForToken("good-code")).willReturn("jwt-xyz");

        mockMvc.perform(post("/api/v1/auth/token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"good-code\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.token").value("jwt-xyz"))
                .andExpect(jsonPath("$.meta.timestamp").exists());
    }

    @Test
    void blank_code_returns_validation_error() throws Exception {
        mockMvc.perform(post("/api/v1/auth/token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("code"));
    }

    @Test
    void invalid_code_returns_401_problem_detail() throws Exception {
        given(authService.exchangeCodeForToken("bad-code"))
                .willThrow(new InvalidLoginCodeException());

        mockMvc.perform(post("/api/v1/auth/token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"bad-code\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Código de login inválido ou expirado"));
    }
}
