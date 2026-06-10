package com.quilombo.tenant;

import org.hibernate.cfg.AvailableSettings;
import org.hibernate.context.spi.CurrentTenantIdentifierResolver;
import org.springframework.boot.hibernate.autoconfigure.HibernatePropertiesCustomizer;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Liga a multi-tenancy por discriminador do Hibernate ({@code @TenantId}) ao
 * {@link TenantContext}. O Hibernate consulta este resolver ao abrir a sessão para
 * preencher o {@code community_id} no insert e filtrar as leituras das entidades
 * tenant-scoped ({@link TenantScopedEntity}).
 *
 * <p>Implementar {@link HibernatePropertiesCustomizer} é o gancho pelo qual o Spring
 * Boot registra o resolver no Hibernate. Sem tenant no contexto (ex.: diretório
 * público), devolve a sentinela {@link #NO_TENANT}, que não casa com nenhuma
 * comunidade — leituras tenant-scoped retornam vazio (fail-closed), em vez de vazar
 * dados de outro tenant.
 */
@Component
public class TenantIdentifierResolver
        implements CurrentTenantIdentifierResolver<Long>, HibernatePropertiesCustomizer {

    /** BIGSERIAL começa em 1; 0 nunca identifica uma comunidade real. */
    static final Long NO_TENANT = 0L;

    @Override
    public Long resolveCurrentTenantIdentifier() {
        return TenantContext.getCommunityId().orElse(NO_TENANT);
    }

    @Override
    public boolean validateExistingCurrentSessions() {
        return false;
    }

    @Override
    public void customize(Map<String, Object> hibernateProperties) {
        hibernateProperties.put(AvailableSettings.MULTI_TENANT_IDENTIFIER_RESOLVER, this);
    }
}
