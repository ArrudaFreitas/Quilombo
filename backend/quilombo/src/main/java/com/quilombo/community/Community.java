package com.quilombo.community;

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
 * Raiz do tenant. NÃO é tenant-scoped (sem {@code @TenantId}): a resolução pública
 * por slug acontece antes de haver tenant no contexto, por isso a tabela não tem
 * política de RLS (V3).
 */
@Entity
@Table(name = "communities")
@Getter
@Setter
public class Community {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String slug;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String location;

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;
}
