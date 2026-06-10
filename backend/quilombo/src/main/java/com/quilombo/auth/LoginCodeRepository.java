package com.quilombo.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;

public interface LoginCodeRepository extends JpaRepository<LoginCode, Long> {

    Optional<LoginCode> findByCodeHash(String codeHash);

    /**
     * Consome (deleta) o código de forma atômica. O número de linhas afetadas
     * distingue o vencedor numa corrida de troca concorrente: só uma transação
     * recebe 1; as demais recebem 0.
     */
    @Modifying
    @Query("delete from LoginCode l where l.id = :id")
    int consumeById(@Param("id") Long id);

    /** Limpeza oportunista de códigos expirados. */
    @Modifying
    @Query("delete from LoginCode l where l.expiresAt < :now")
    int deleteExpired(@Param("now") Instant now);
}
