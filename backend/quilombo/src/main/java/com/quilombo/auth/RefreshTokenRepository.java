package com.quilombo.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    /** Busca já filtrada pelo tenant atual ({@code @TenantId} + RLS). */
    Optional<RefreshToken> findByTokenHash(String tokenHash);

    /**
     * Consome (deleta) o token de forma atômica — o número de linhas afetadas
     * distingue o vencedor numa rotação concorrente, como nos login codes.
     */
    @Modifying
    @Query("delete from RefreshToken r where r.id = :id")
    int consumeById(@Param("id") Long id);

    /** Logout: revoga pelo hash, idempotente. */
    @Modifying
    @Query("delete from RefreshToken r where r.tokenHash = :tokenHash")
    int deleteByTokenHash(@Param("tokenHash") String tokenHash);

    /** Limpeza oportunista de tokens expirados. */
    @Modifying
    @Query("delete from RefreshToken r where r.expiresAt < :now")
    int deleteExpired(@Param("now") Instant now);
}
