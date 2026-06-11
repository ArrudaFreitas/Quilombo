package com.quilombo.media;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

/**
 * Objetos de mídia do tenant. A filtragem por comunidade é automática
 * ({@code @TenantId} herdado de {@link StorageObject}) e confirmada pelo RLS.
 */
public interface StorageObjectRepository extends JpaRepository<StorageObject, Long> {

    Optional<StorageObject> findByFilename(String filename);

    /** Listagem do acervo, mais recentes primeiro (como no MVP). */
    List<StorageObject> findAllByOrderByCreatedAtDesc();

    /** Total de bytes usados pela comunidade — base da quota. */
    @Query("select coalesce(sum(s.sizeBytes), 0) from StorageObject s")
    long sumSizeBytes();
}
