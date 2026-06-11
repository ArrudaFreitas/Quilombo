package com.quilombo.community;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CommunityCardRepository extends JpaRepository<CommunityCard, Long> {

    Optional<CommunityCard> findByCommunitySlug(String communitySlug);

    Page<CommunityCard> findByNameContainingIgnoreCase(String name, Pageable pageable);
}
