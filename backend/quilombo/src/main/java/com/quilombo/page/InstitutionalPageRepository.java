package com.quilombo.page;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface InstitutionalPageRepository extends JpaRepository<InstitutionalPage, Long> {

    /** A linha do tenant atual — {@code @TenantId} garante no máximo uma. */
    Optional<InstitutionalPage> findTopByOrderByIdAsc();
}
