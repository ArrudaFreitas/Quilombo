package com.quilombo.seed;

import com.quilombo.TestDatabase;
import com.quilombo.TestcontainersConfiguration;
import com.quilombo.auth.AdminRepository;
import com.quilombo.auth.EmailHasher;
import com.quilombo.community.CommunityCardRepository;
import com.quilombo.community.CommunityRepository;
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

    @Autowired
    CommunityRepository communities;

    @Autowired
    CommunityCardRepository cards;

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

    @Test
    void seeds_mvp_communities_and_dev_admin_idempotently() throws Exception {
        var seeder = new DevDataSeeder(communities, cards, admins, emailHasher, DEV_EMAIL);

        seeder.run(null);
        seeder.run(null); // reexecutar não duplica

        assertThat(communities.count()).isEqualTo(3);
        assertThat(communities.findBySlug("kalunga")).isPresent();
        assertThat(communities.findBySlug("palmares")).isPresent();
        assertThat(communities.findBySlug("frechal")).isPresent();

        // um card público por comunidade, aguardando imagem/descrição do admin
        assertThat(cards.count()).isEqualTo(3);
        assertThat(cards.findByCommunitySlug("kalunga"))
                .hasValueSatisfying(card -> {
                    assertThat(card.getName()).isEqualTo("Kalunga");
                    assertThat(card.getImageUrl()).isNull();
                    assertThat(card.getShortDescription()).isNull();
                });

        // um admin por comunidade, visível apenas no tenant correspondente
        var emailHash = emailHasher.hash(DEV_EMAIL);
        for (var community : communities.findAll()) {
            TenantContext.setCommunityId(community.getId());
            assertThat(admins.findByEmailHash(emailHash)).isPresent();
            assertThat(admins.count()).isEqualTo(1);
            TenantContext.clear();
        }
    }

    @Test
    void without_dev_admin_email_seeds_only_communities() throws Exception {
        new DevDataSeeder(communities, cards, admins, emailHasher, "").run(null);

        assertThat(communities.count()).isEqualTo(3);
        assertThat(cards.count()).isEqualTo(3);
        try (var owner = DriverManager.getConnection(jdbcUrl, ownerUser, ownerPassword);
             var st = owner.createStatement();
             var rs = st.executeQuery("SELECT count(*) FROM admins")) {
            rs.next();
            assertThat(rs.getLong(1)).isZero();
        }
    }
}
