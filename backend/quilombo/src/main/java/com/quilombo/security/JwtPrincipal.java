package com.quilombo.security;

import java.security.Principal;

/**
 * Principal autenticado extraído dos claims do JWT pelo {@link JwtAuthenticationFilter}.
 * Implementa {@link Principal} para que {@code Authentication#getName()} continue
 * devolvendo o id do admin (o subject do token — sem PII).
 */
public record JwtPrincipal(Long adminId, String name) implements Principal {

    @Override
    public String getName() {
        return adminId.toString();
    }
}
