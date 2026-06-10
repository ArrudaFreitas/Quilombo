package com.quilombo.common.api;

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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest
@Import({WebConfig.class, GlobalExceptionHandler.class, EnvelopeDemoController.class})
@AutoConfigureMockMvc(addFilters = false)
class ApiResponseWebTest {

    @Autowired
    MockMvc mockMvc;

    // JwtAuthenticationFilter (um Filter @Component) é detectado pelo slice e exige
    // JwtService; mockamos para o contexto subir. O filtro não roda (addFilters = false).
    @MockitoBean
    JwtService jwtService;

    @Test
    void single_resource_is_wrapped_without_page_meta() throws Exception {
        mockMvc.perform(get("/api/v1/demo"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.value").value("hello"))
                .andExpect(jsonPath("$.meta.timestamp").exists())
                .andExpect(jsonPath("$.meta.page").doesNotExist());
    }

    @Test
    void paginated_response_carries_page_meta() throws Exception {
        mockMvc.perform(get("/api/v1/demo/page"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].value").value("a"))
                .andExpect(jsonPath("$.meta.page.size").value(20))
                .andExpect(jsonPath("$.meta.page.number").value(0))
                .andExpect(jsonPath("$.meta.page.totalElements").value(1))
                .andExpect(jsonPath("$.meta.page.totalPages").value(1));
    }

    @Test
    void validation_error_returns_problem_detail_with_field_errors() throws Exception {
        mockMvc.perform(post("/api/v1/demo")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"slug\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Falha de validação"))
                .andExpect(jsonPath("$.errors[0].field").value("slug"));
    }
}
