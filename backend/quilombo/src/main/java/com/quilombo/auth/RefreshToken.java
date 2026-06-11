package com.quilombo.auth;

import com.quilombo.tenant.TenantScopedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

/**
 * Sessão longa do admin: token opaco entregue em cookie httpOnly, persistido
 * apenas como hash SHA-256. Rotacionado a cada uso (consumo atômico + emissão
 * de outro). Tenant-scoped ({@code @TenantId} + RLS, V5): o refresh acontece no
 * subdomínio da comunidade e só enxerga as sessões daquele tenant.
 */
@Entity
@Table(name = "refresh_tokens")
@Getter
@Setter
public class RefreshToken extends TenantScopedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;

    @Column(name = "admin_id", nullable = false)
    private Long adminId;

    /** Claim "name" re-cunhado no access token a cada rotação. */
    @Column(nullable = false)
    private String name;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;
}
