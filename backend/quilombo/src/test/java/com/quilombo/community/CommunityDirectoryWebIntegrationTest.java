package com.quilombo.community;

import com.quilombo.TestcontainersConfiguration;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.sql.DriverManager;
import java.sql.SQLException;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Listagem pública de comunidades de ponta a ponta: sem autenticação, na raiz do
 * domínio (sem tenant) e também a partir de um subdomínio — a leitura de
 * {@code community_cards} é cross-tenant por design (sem RLS, V3).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@ActiveProfiles("dev")
class CommunityDirectoryWebIntegrationTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    CommunityRepository communities;

    @Autowired
    CommunityCardRepository cards;

    @Value("${spring.datasource.url}")
    String jdbcUrl;

    @Value("${spring.flyway.user}")
    String ownerUser;

    @Value("${spring.flyway.password}")
    String ownerPassword;

    @BeforeEach
    void seed() throws SQLException {
        try (var owner = DriverManager.getConnection(jdbcUrl, ownerUser, ownerPassword);
             var st = owner.createStatement()) {
            st.execute("DELETE FROM community_cards");
            st.execute("DELETE FROM communities");
        }
        community("kalunga", "Kalunga", "Chapada dos Veadeiros, GO");
        community("palmares", "Quilombo dos Palmares", "União dos Palmares, AL");
        community("frechal", "Frechal", "Mirinzal, MA");
        card("kalunga", "Kalunga", "Chapada dos Veadeiros, GO",
                "/uploads/kalunga.webp", "Maior comunidade quilombola do país");
        card("palmares", "Quilombo dos Palmares", "União dos Palmares, AL", null, null);
        card("frechal", "Frechal", "Mirinzal, MA", null, null);
    }

    @Test
    void lists_all_cards_on_root_domain_sorted_by_name_with_page_meta() throws Exception {
        mockMvc.perform(get("https://quilombo.localhost/api/v1/communities"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(3))
                .andExpect(jsonPath("$.data[0].name").value("Frechal"))
                .andExpect(jsonPath("$.data[1].name").value("Kalunga"))
                .andExpect(jsonPath("$.data[2].name").value("Quilombo dos Palmares"))
                .andExpect(jsonPath("$.data[1].slug").value("kalunga"))
                .andExpect(jsonPath("$.data[1].location").value("Chapada dos Veadeiros, GO"))
                .andExpect(jsonPath("$.data[1].imageUrl").value("/uploads/kalunga.webp"))
                .andExpect(jsonPath("$.data[1].shortDescription")
                        .value("Maior comunidade quilombola do país"))
                .andExpect(jsonPath("$.meta.page.totalElements").value(3))
                .andExpect(jsonPath("$.meta.page.number").value(0));
    }

    @Test
    void filters_by_partial_name_case_insensitively() throws Exception {
        mockMvc.perform(get("https://quilombo.localhost/api/v1/communities")
                        .param("name", "PALMA"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].slug").value("palmares"))
                .andExpect(jsonPath("$.meta.page.totalElements").value(1));
    }

    @Test
    void blank_name_filter_behaves_as_no_filter() throws Exception {
        mockMvc.perform(get("https://quilombo.localhost/api/v1/communities")
                        .param("name", "   "))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(3));
    }

    @Test
    void unmatched_filter_returns_empty_page() throws Exception {
        mockMvc.perform(get("https://quilombo.localhost/api/v1/communities")
                        .param("name", "inexistente"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(0))
                .andExpect(jsonPath("$.meta.page.totalElements").value(0));
    }

    @Test
    void pagination_params_are_honored() throws Exception {
        mockMvc.perform(get("https://quilombo.localhost/api/v1/communities")
                        .param("page", "1")
                        .param("size", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].name").value("Quilombo dos Palmares"))
                .andExpect(jsonPath("$.meta.page.size").value(2))
                .andExpect(jsonPath("$.meta.page.number").value(1))
                .andExpect(jsonPath("$.meta.page.totalElements").value(3))
                .andExpect(jsonPath("$.meta.page.totalPages").value(2));
    }

    @Test
    void listing_from_a_subdomain_still_sees_all_communities() throws Exception {
        // leitura cross-tenant intencional: o card não é tenant-scoped
        mockMvc.perform(get("https://kalunga.quilombo.localhost/api/v1/communities"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(3));
    }

    private void community(String slug, String name, String location) {
        var community = new Community();
        community.setSlug(slug);
        community.setName(name);
        community.setLocation(location);
        communities.save(community);
    }

    private void card(String slug, String name, String location,
                      String imageUrl, String shortDescription) {
        var card = new CommunityCard();
        card.setCommunitySlug(slug);
        card.setName(name);
        card.setLocation(location);
        card.setImageUrl(imageUrl);
        card.setShortDescription(shortDescription);
        cards.save(card);
    }
}
