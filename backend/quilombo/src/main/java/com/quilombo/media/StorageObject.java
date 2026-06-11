package com.quilombo.media;

import com.quilombo.tenant.TenantScopedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Generated;
import org.hibernate.generator.EventType;

import java.time.Instant;

/**
 * Objeto da biblioteca de mídia da comunidade, mapeado para {@code storage_usage}.
 * Cada linha é uma imagem já processada (resize + WebP) guardada no object storage;
 * a soma de {@code sizeBytes} por tenant é a quota usada. Tenant-scoped via
 * {@link TenantScopedEntity} ({@code @TenantId} + RLS).
 */
@Entity
@Table(name = "storage_usage")
@Getter
@Setter
public class StorageObject extends TenantScopedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Nome único do objeto ({@code <slug>_<token>.webp}); também a chave no storage. */
    @Column(nullable = false, length = 255)
    private String filename;

    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;

    @Column(name = "alt_text", nullable = false)
    private String altText = "";

    @Generated(event = EventType.INSERT)
    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;
}
