package com.quilombo.tenant;

import com.quilombo.TestDatabase;
import com.quilombo.TestcontainersConfiguration;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Prova o RLS (V3) na camada do BANCO, com SQL direto — sem Hibernate e sem
 * {@code @TenantId}. É a garantia de que uma consulta que escape da aplicação
 * (query nativa, bug, ferramenta externa conectada como a role de runtime)
 * continua isolada por tenant.
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
@ActiveProfiles("dev")
class RowLevelSecurityIntegrationTest {

    @Value("${spring.datasource.url}")
    String jdbcUrl;

    @Value("${spring.flyway.user}")
    String ownerUser;

    @Value("${spring.flyway.password}")
    String ownerPassword;

    long communityA;
    long communityB;

    @BeforeEach
    void seedAsOwner() throws SQLException {
        try (var owner = ownerConnection(); var st = owner.createStatement()) {
            TestDatabase.wipe(st);
            try (var rs = st.executeQuery(
                    "INSERT INTO communities (slug, name, location) VALUES ('kalunga', 'Kalunga', 'GO') RETURNING id")) {
                rs.next();
                communityA = rs.getLong(1);
            }
            try (var rs = st.executeQuery(
                    "INSERT INTO communities (slug, name, location) VALUES ('palmares', 'Palmares', 'AL') RETURNING id")) {
                rs.next();
                communityB = rs.getLong(1);
            }
            st.execute("INSERT INTO community_profiles (community_id, short_description) VALUES ("
                    + communityA + ", 'perfil A')");
            st.execute("INSERT INTO community_profiles (community_id, short_description) VALUES ("
                    + communityB + ", 'perfil B')");
        }
    }

    @Test
    void app_role_with_tenant_guc_sees_only_that_tenants_rows() throws SQLException {
        try (var app = appConnection()) {
            setTenant(app, communityA);
            try (var st = app.createStatement();
                 var rs = st.executeQuery("SELECT community_id FROM community_profiles")) {
                assertThat(rs.next()).isTrue();
                assertThat(rs.getLong(1)).isEqualTo(communityA);
                assertThat(rs.next()).isFalse();
            }
        }
    }

    @Test
    void app_role_without_tenant_guc_sees_nothing() throws SQLException {
        try (var app = appConnection();
             var st = app.createStatement();
             var rs = st.executeQuery("SELECT count(*) FROM community_profiles")) {
            rs.next();
            assertThat(rs.getLong(1)).isZero(); // fail-closed: GUC ausente -> NULL -> nada casa
        }
    }

    @Test
    void app_role_cannot_write_rows_of_another_tenant() throws SQLException {
        try (var owner = ownerConnection(); var st = owner.createStatement()) {
            st.execute("DELETE FROM community_profiles WHERE community_id = " + communityB);
        }
        try (var app = appConnection()) {
            setTenant(app, communityA);
            assertThatThrownBy(() -> {
                try (var st = app.createStatement()) {
                    st.execute("INSERT INTO community_profiles (community_id, short_description) VALUES ("
                            + communityB + ", 'intruso')");
                }
            }).isInstanceOf(SQLException.class)
              .hasMessageContaining("row-level security"); // WITH CHECK da política
        }
    }

    @Test
    void schema_owner_bypasses_rls() throws SQLException {
        try (var owner = ownerConnection();
             var st = owner.createStatement();
             var rs = st.executeQuery("SELECT count(*) FROM community_profiles")) {
            rs.next();
            assertThat(rs.getLong(1)).isEqualTo(2); // dono (migrador) não é afetado
        }
    }

    private Connection appConnection() throws SQLException {
        return DriverManager.getConnection(jdbcUrl, "quilombo_app", "quilombo_app");
    }

    private Connection ownerConnection() throws SQLException {
        return DriverManager.getConnection(jdbcUrl, ownerUser, ownerPassword);
    }

    private static void setTenant(Connection connection, long communityId) throws SQLException {
        try (var ps = connection.prepareStatement("SELECT set_config('app.current_tenant', ?, false)")) {
            ps.setString(1, String.valueOf(communityId));
            ps.execute();
        }
    }
}
