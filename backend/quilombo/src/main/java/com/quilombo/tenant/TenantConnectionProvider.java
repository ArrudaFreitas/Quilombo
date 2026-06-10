package com.quilombo.tenant;

import org.hibernate.cfg.AvailableSettings;
import org.hibernate.engine.jdbc.connections.spi.MultiTenantConnectionProvider;
import org.springframework.boot.hibernate.autoconfigure.HibernatePropertiesCustomizer;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Map;

/**
 * Injeta o tenant atual no Postgres a cada sessão do Hibernate, alimentando a 2ª
 * camada de isolamento (Row-Level Security). Antes de a sessão usar a conexão,
 * grava a GUC {@code app.current_tenant} que as políticas de RLS leem (V3). O
 * runtime conecta como uma role não-dona, então o RLS vale.
 *
 * <p>Grava a GUC <b>sempre</b> — mesmo a sentinela "sem tenant" (0) é gravada, pois
 * não casa com nenhuma comunidade (fail-closed) e ainda sobrescreve qualquer valor
 * remanescente da conexão no pool. Ao devolver a conexão, dá {@code RESET} para não
 * vazar tenant entre requisições.
 */
@Component
public class TenantConnectionProvider
        implements MultiTenantConnectionProvider<Long>, HibernatePropertiesCustomizer {

    private static final String SET_TENANT_SQL = "SELECT set_config('app.current_tenant', ?, false)";
    private static final String RESET_TENANT_SQL = "RESET app.current_tenant";

    private final DataSource dataSource;

    public TenantConnectionProvider(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public Connection getAnyConnection() throws SQLException {
        return dataSource.getConnection();
    }

    @Override
    public void releaseAnyConnection(Connection connection) throws SQLException {
        connection.close();
    }

    @Override
    public Connection getConnection(Long tenantIdentifier) throws SQLException {
        Connection connection = getAnyConnection();
        try (PreparedStatement statement = connection.prepareStatement(SET_TENANT_SQL)) {
            statement.setString(1, tenantIdentifier.toString());
            statement.execute();
        }
        return connection;
    }

    @Override
    public void releaseConnection(Long tenantIdentifier, Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute(RESET_TENANT_SQL);
        } finally {
            connection.close();
        }
    }

    @Override
    public boolean supportsAggressiveRelease() {
        return false;
    }

    @Override
    public boolean isUnwrappableAs(Class<?> unwrapType) {
        return false;
    }

    @Override
    public <T> T unwrap(Class<T> unwrapType) {
        return null;
    }

    @Override
    public void customize(Map<String, Object> hibernateProperties) {
        hibernateProperties.put(AvailableSettings.MULTI_TENANT_CONNECTION_PROVIDER, this);
    }
}
