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

/**
 * Allowlist de administradores por comunidade, cadastrada manualmente após a
 * validação do Google Forms. Tenant-scoped ({@code @TenantId} + RLS): a busca no
 * login só enxerga os admins da comunidade do subdomínio. Guarda apenas o
 * {@link EmailHasher HMAC do e-mail} — nunca o e-mail cru (LGPD, V4).
 */
@Entity
@Table(name = "admins")
@Getter
@Setter
public class Admin extends TenantScopedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "email_hash", nullable = false, length = 64)
    private String emailHash;
}
