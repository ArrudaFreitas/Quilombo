package com.quilombo.tenant;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import lombok.Getter;
import org.hibernate.annotations.TenantId;

/**
 * Base das entidades tenant-scoped. O {@code community_id} é gerido pelo Hibernate
 * via {@link TenantId}: preenchido no insert a partir do {@link TenantIdentifierResolver}
 * e aplicado como filtro automático nas leituras. A aplicação nunca o define
 * manualmente (sem setter).
 */
@MappedSuperclass
@Getter
public abstract class TenantScopedEntity {

    @TenantId
    @Column(name = "community_id", nullable = false, updatable = false)
    private Long communityId;
}
