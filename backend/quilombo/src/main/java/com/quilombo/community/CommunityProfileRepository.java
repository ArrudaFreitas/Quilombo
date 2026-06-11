package com.quilombo.community;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CommunityProfileRepository extends JpaRepository<CommunityProfile, Long> {

    /** O perfil do tenant atual — {@code @TenantId} garante no máximo um. */
    Optional<CommunityProfile> findTopByOrderByIdAsc();
}
