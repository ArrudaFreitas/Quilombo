package com.quilombo.auth;

import com.quilombo.security.JwtPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Guarda das rotas administrativas: valida a sessão do admin autenticado,
 * revalidando contra o banco — mesmo contrato do {@code GET /auth/me}.
 *
 * <p>{@code principal} nulo cobre o profile dev (permitAll deixa a requisição
 * chegar sem token) — 401 igual ao prod. A busca é tenant-scoped
 * ({@code @TenantId} + RLS): admin removido da allowlist após a emissão do JWT
 * deixa de existir para o tenant e perde o acesso imediatamente, sem blocklist.
 */
@Service
@RequiredArgsConstructor
public class AdminSessionService {

    private final AdminRepository admins;

    @Transactional(readOnly = true)
    public Admin requireAdmin(JwtPrincipal principal) {
        if (principal == null) {
            throw new InvalidSessionException();
        }
        return admins.findById(principal.adminId())
                .orElseThrow(InvalidSessionException::new);
    }
}
