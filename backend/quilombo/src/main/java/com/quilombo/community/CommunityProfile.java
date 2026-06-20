package com.quilombo.community;

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
 * Dados editáveis do card público da comunidade. Primeira entidade tenant-scoped:
 * o {@code community_id} vem de {@link TenantScopedEntity} ({@code @TenantId}) — o
 * Hibernate o preenche no insert e filtra as leituras pelo tenant atual; o RLS (V3)
 * garante o mesmo isolamento na camada do banco.
 */
@Entity
@Table(name = "community_profiles")
@Getter
@Setter
public class CommunityProfile extends TenantScopedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "image_alt_text", length = 500)
    private String imageAltText;

    @Column(name = "short_description")
    private String shortDescription;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private Instant updatedAt;
}
