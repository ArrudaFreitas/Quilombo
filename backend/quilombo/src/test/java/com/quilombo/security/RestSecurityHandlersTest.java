package com.quilombo.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import tools.jackson.databind.json.JsonMapper;

import java.io.UnsupportedEncodingException;

import static org.assertj.core.api.Assertions.assertThat;

/** 401/403 da security chain saem como ProblemDetail (RFC 7807), como o resto da API. */
class RestSecurityHandlersTest {

    private final JsonMapper objectMapper = JsonMapper.builder().build();

    @Test
    void entry_point_writes_401_problem_detail() throws Exception {
        var response = new MockHttpServletResponse();

        new RestAuthenticationEntryPoint(objectMapper).commence(
                request(), response, new InsufficientAuthenticationException("x"));

        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(response.getContentType()).isEqualTo("application/problem+json");
        assertThat(body(response))
                .contains("\"status\":401")
                .contains("Autenticação necessária")
                .contains("/api/v1/recurso");
    }

    @Test
    void access_denied_handler_writes_403_problem_detail() throws Exception {
        var response = new MockHttpServletResponse();

        new RestAccessDeniedHandler(objectMapper).handle(
                request(), response, new AccessDeniedException("x"));

        assertThat(response.getStatus()).isEqualTo(403);
        assertThat(response.getContentType()).isEqualTo("application/problem+json");
        assertThat(body(response))
                .contains("\"status\":403")
                .contains("Acesso negado");
    }

    private static MockHttpServletRequest request() {
        var request = new MockHttpServletRequest("GET", "/api/v1/recurso");
        return request;
    }

    private static String body(MockHttpServletResponse response) throws UnsupportedEncodingException {
        return response.getContentAsString();
    }
}
