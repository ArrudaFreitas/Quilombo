package com.quilombo.tenant;

import com.quilombo.community.Community;
import com.quilombo.community.CommunityRepository;
import com.quilombo.config.AppProperties;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Locale;

/**
 * Resolve o tenant pelo <b>subdomínio</b> do Host (o nginx preserva o Host original,
 * ex.: {@code kalunga.quilombo.localhost}) e o registra no {@link TenantContext}.
 *
 * <ul>
 *   <li>Host na raiz ({@code quilombo.localhost}) ou fora do domínio base
 *       (ex.: {@code localhost} para actuator/testes) — sem tenant; leituras
 *       tenant-scoped caem na sentinela fail-closed do
 *       {@link TenantIdentifierResolver}.</li>
 *   <li>Subdomínio de um nível ({@code <slug>.quilombo.localhost}) — resolve a
 *       comunidade pelo slug; inexistente resulta em 404.</li>
 * </ul>
 *
 * <p>A consulta de resolução roda <b>antes</b> de haver tenant no contexto — por
 * isso {@code communities} não é tenant-scoped nem tem política de RLS (V3).
 */
@Component
@RequiredArgsConstructor
public class TenantInterceptor implements HandlerInterceptor {

    // ObjectProvider: @WebMvcTest inclui HandlerInterceptor no slice, mas sem os
    // repositórios JPA — a resolução tardia permite o slice subir sem o banco.
    private final ObjectProvider<CommunityRepository> communityRepository;
    private final AppProperties appProperties;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String slug = slugFromHost(request.getServerName(), appProperties.baseDomain());
        if (slug == null) {
            return true;
        }
        Community community = communityRepository.getObject().findBySlug(slug)
                .orElseThrow(() -> new TenantNotFoundException(slug));
        var current = TenantContext.getCommunityId();
        if (current.isPresent()) {
            // Tenant já resolvido pelo claim do JWT (autoritativo): apenas
            // cross-check defensivo com o subdomínio — não sobrescreve.
            if (!current.get().equals(community.getId())) {
                throw new TenantMismatchException();
            }
        } else {
            TenantContext.setCommunityId(community.getId());
        }
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response,
                                Object handler, Exception ex) {
        TenantContext.clear();
    }

    /**
     * Extrai o slug do subdomínio, ou {@code null} quando o host é a raiz do domínio
     * base ou não pertence a ele. Subdomínios aninhados ({@code a.b.quilombo.localhost})
     * não são tenants válidos.
     */
    static String slugFromHost(String host, String baseDomain) {
        if (host == null || host.isBlank()) {
            return null;
        }
        String normalized = host.toLowerCase(Locale.ROOT);
        String suffix = "." + baseDomain;
        if (normalized.equals(baseDomain) || !normalized.endsWith(suffix)) {
            return null;
        }
        String sub = normalized.substring(0, normalized.length() - suffix.length());
        if (sub.isEmpty() || sub.contains(".")) {
            return null;
        }
        return sub;
    }
}
