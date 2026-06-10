package com.quilombo.auth;

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
 * Código de troca de uso único emitido no sucesso do login OAuth.
 * Armazena apenas o hash do código — o código em si só trafega na URL de redirect
 * por poucos segundos e é consumido na primeira troca — e o HMAC do e-mail
 * verificado pelo Google (nunca o e-mail cru — LGPD, V4).
 */
@Entity
@Table(name = "auth_login_codes")
@Getter
@Setter
public class LoginCode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "code_hash", nullable = false, unique = true, length = 64)
    private String codeHash;

    @Column(name = "email_hash", nullable = false, length = 64)
    private String emailHash;

    @Column(nullable = false)
    private String name;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;
}
