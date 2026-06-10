package com.quilombo.tenant;

import com.quilombo.TestcontainersConfiguration;
import com.quilombo.community.Community;
import com.quilombo.community.CommunityProfile;
import com.quilombo.community.CommunityProfileRepository;
import com.quilombo.community.CommunityRepository;
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
 * Prova a 1ª camada de isolamento — {@code @TenantId} do Hibernate: o
 * {@code community_id} é preenchido no insert a partir do {@link TenantContext}
 * e filtra as leituras automaticamente, sem a aplicação passar tenant em query
 * alguma. O RLS (V3) segue ativo por baixo, como 2ª camada.
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
@ActiveProfiles("dev")
class TenantIdIntegrationTest {

    @Autowired
    CommunityRepository communities;

    @Autowired
    CommunityProfileRepository profiles;

    @Value("${spring.datasource.url}")
    String jdbcUrl;

    @Value("${spring.flyway.user}")
    String ownerUser;

    @Value("${spring.flyway.password}")
    String ownerPassword;

    Long communityA;
    Long communityB;

    @BeforeEach
    void seed() throws SQLException {
        cleanAsOwner();
        // communities não é tenant-scoped: criável sem tenant no contexto
        communityA = communities.save(community("kalunga", "Kalunga", "GO")).getId();
        communityB = communities.save(community("palmares", "Palmares", "AL")).getId();
    }

    @AfterEach
    void clearTenant() {
        TenantContext.clear();
    }

    @Test
    void fills_community_id_on_insert_from_current_tenant() {
        TenantContext.setCommunityId(communityA);
        var saved = profiles.save(profile("perfil A"));

        assertThat(saved.getCommunityId()).isEqualTo(communityA); // @TenantId preencheu
    }

    @Test
    void filters_reads_by_current_tenant_without_explicit_query() {
        TenantContext.setCommunityId(communityA);
        profiles.save(profile("perfil A"));
        TenantContext.setCommunityId(communityB);
        profiles.save(profile("perfil B"));

        TenantContext.setCommunityId(communityA);
        assertThat(profiles.findAll())
                .singleElement()
                .extracting(CommunityProfile::getShortDescription)
                .isEqualTo("perfil A");
    }

    @Test
    void without_tenant_in_context_reads_nothing() {
        TenantContext.setCommunityId(communityA);
        profiles.save(profile("perfil A"));

        TenantContext.clear();
        assertThat(profiles.findAll()).isEmpty(); // sentinela fail-closed
    }

    @Test
    void find_by_id_of_another_tenant_comes_back_empty() {
        TenantContext.setCommunityId(communityB);
        var profileB = profiles.save(profile("perfil B"));

        TenantContext.setCommunityId(communityA);
        // mesmo por id direto, a linha de B não existe para a sessão de A (RLS)
        assertThat(profiles.findById(profileB.getId())).isEmpty();
    }

    private static Community community(String slug, String name, String location) {
        var community = new Community();
        community.setSlug(slug);
        community.setName(name);
        community.setLocation(location);
        return community;
    }

    private static CommunityProfile profile(String shortDescription) {
        var profile = new CommunityProfile();
        profile.setShortDescription(shortDescription);
        return profile;
    }

    private void cleanAsOwner() throws SQLException {
        try (var owner = DriverManager.getConnection(jdbcUrl, ownerUser, ownerPassword);
             var st = owner.createStatement()) {
            st.execute("DELETE FROM community_profiles");
            st.execute("DELETE FROM communities");
        }
    }
}
