package com.quilombo.tenant;

import java.util.Optional;

/**
 * Guarda o {@code community_id} do tenant da requisição atual em um {@link ThreadLocal}.
 * É populado pelo {@link TenantInterceptor} no início da requisição e limpo ao final
 * (evita vazamento entre threads do pool do servlet container).
 */
public final class TenantContext {

    private static final ThreadLocal<Long> CURRENT = new ThreadLocal<>();

    private TenantContext() {
    }

    public static void setCommunityId(Long communityId) {
        CURRENT.set(communityId);
    }

    public static Optional<Long> getCommunityId() {
        return Optional.ofNullable(CURRENT.get());
    }

    /** Retorna o tenant atual ou lança se não houver — uso em código que exige tenant resolvido. */
    public static Long requireCommunityId() {
        Long id = CURRENT.get();
        if (id == null) {
            throw new IllegalStateException("Tenant não resolvido no contexto da requisição");
        }
        return id;
    }

    public static void clear() {
        CURRENT.remove();
    }
}
