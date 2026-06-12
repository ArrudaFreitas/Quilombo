package com.quilombo.seed;

import com.quilombo.TestDatabase;
import com.quilombo.TestcontainersConfiguration;
import com.quilombo.auth.AdminRepository;
import com.quilombo.auth.EmailHasher;
import com.quilombo.community.CommunityCardRepository;
import com.quilombo.community.CommunityProfileRepository;
import com.quilombo.community.CommunityRepository;
import com.quilombo.page.InstitutionalPageRepository;
import com.quilombo.page.PageSectionRepository;
import com.quilombo.tenant.TenantContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * O bean do seeder fica desligado nos testes ({@code app.seed.enabled=false} no
 * {@link TestcontainersConfiguration}); aqui ele é instanciado manualmente para
 * provar o comportamento contra o banco real.
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
@ActiveProfiles("dev")
class DevDataSeederIntegrationTest {

    private static final String DEV_EMAIL = "dev@example.com";

    /** Seções por comunidade no seed/dev-pages.json (paridade com o MVP). */
    private static final Map<String, Integer> SECTIONS_PER_SLUG =
            Map.of("kalunga", 6, "palmares", 7, "frechal", 4);

    @Autowired
    CommunityRepository communities;

    @Autowired
    CommunityCardRepository cards;

    @Autowired
    CommunityProfileRepository profiles;

    @Autowired
    InstitutionalPageRepository pages;

    @Autowired
    PageSectionRepository sections;

    @Autowired
    AdminRepository admins;

    @Autowired
    EmailHasher emailHasher;

    @Value("${spring.datasource.url}")
    String jdbcUrl;

    @Value("${spring.flyway.user}")
    String ownerUser;

    @Value("${spring.flyway.password}")
    String ownerPassword;

    @BeforeEach
    void clean() throws SQLException {
        TestDatabase.wipe(jdbcUrl, ownerUser, ownerPassword);
    }

    @AfterEach
    void clearTenant() {
        TenantContext.clear();
    }

    private DevDataSeeder seeder(String devAdminEmail) {
        return new DevDataSeeder(communities, cards, profiles, pages, sections,
                admins, emailHasher, devAdminEmail);
    }

    @Test
    void seeds_mvp_communities_with_pages_and_admins_idempotently() throws Exception {
        var seeder = seeder(DEV_EMAIL);

        seeder.run(null);
        seeder.run(null); // reexecutar não duplica

        assertThat(communities.count()).isEqualTo(3);

        // um card público por comunidade, já com a descrição do MVP
        assertThat(cards.count()).isEqualTo(3);
        assertThat(cards.findByCommunitySlug("kalunga"))
                .hasValueSatisfying(card -> {
                    assertThat(card.getName()).isEqualTo("Kalunga");
                    assertThat(card.getImageUrl()).isNull();
                    assertThat(card.getShortDescription()).contains("250 mil hectares");
                });

        // página institucional completa por tenant, com as seções do MVP
        for (var community : communities.findAll()) {
            TenantContext.setCommunityId(community.getId());

            assertThat(pages.findTopByOrderByIdAsc()).isPresent();
            var seeded = sections.findAllByOrderByOrderIndexAsc();
            assertThat(seeded).hasSize(SECTIONS_PER_SLUG.get(community.getSlug()));
            assertThat(seeded.getFirst().getSectionType()).isEqualTo("hero");
            assertThat(seeded.getFirst().getContent()).containsKey("title");

            assertThat(profiles.findTopByOrderByIdAsc())
                    .hasValueSatisfying(profile ->
                            assertThat(profile.getShortDescription()).isNotBlank());

            // allowlist: admin de demonstração + DEV_ADMIN_EMAIL
            var demoHash = emailHasher.hash(
                    "admin." + community.getSlug() + "@example.com");
            assertThat(admins.findByEmailHash(demoHash)).isPresent();
            assertThat(admins.findByEmailHash(emailHasher.hash(DEV_EMAIL))).isPresent();
            assertThat(admins.count()).isEqualTo(2);

            TenantContext.clear();
        }
    }

    @Test
    void seeding_does_not_overwrite_admin_edits() throws Exception {
        seeder("").run(null);

        var kalunga = communities.findBySlug("kalunga").orElseThrow();
        TenantContext.setCommunityId(kalunga.getId());
        var page = pages.findTopByOrderByIdAsc().orElseThrow();
        page.setStyle("raizes");
        page.setPalette("indigo");
        pages.save(page);
        TenantContext.clear();

        seeder("").run(null); // segunda execução não toca na página editada

        TenantContext.setCommunityId(kalunga.getId());
        assertThat(pages.findTopByOrderByIdAsc())
                .hasValueSatisfying(edited -> {
                    assertThat(edited.getStyle()).isEqualTo("raizes");
                    assertThat(edited.getPalette()).isEqualTo("indigo");
                });
    }

    @Test
    void without_dev_admin_email_seeds_only_the_demo_admins() throws Exception {
        seeder("").run(null);

        assertThat(communities.count()).isEqualTo(3);
        try (var owner = DriverManager.getConnection(jdbcUrl, ownerUser, ownerPassword);
             var st = owner.createStatement();
             var rs = st.executeQuery("SELECT count(*) FROM admins")) {
            rs.next();
            assertThat(rs.getLong(1)).isEqualTo(3); // 1 admin de demonstração por comunidade
        }
    }
}
