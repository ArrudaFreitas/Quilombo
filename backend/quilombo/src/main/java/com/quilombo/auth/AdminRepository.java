package com.quilombo.auth;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AdminRepository extends JpaRepository<Admin, Long> {

    /** Busca já filtrada pelo tenant atual ({@code @TenantId} + RLS). */
    Optional<Admin> findByEmailHash(String emailHash);
}
