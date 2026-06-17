package com.quilombo.security;

import com.quilombo.tenant.TenantContext;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain chain)
            throws ServletException, IOException {
        var authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            chain.doFilter(request, response);
            return;
        }
        var tenantSetHere = false;
        try {
            var claims = jwtService.parseToken(authHeader.substring(7));
            if (SecurityContextHolder.getContext().getAuthentication() == null) {
                var principal = new JwtPrincipal(
                        Long.parseLong(claims.getSubject()),
                        claims.get("name", String.class));
                var auth = new UsernamePasswordAuthenticationToken(
                        principal, null, List.of());
                auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(auth);

                // O claim do JWT é a fonte autoritativa do tenant do admin; o
                // TenantInterceptor cruza com o subdomínio (403 se divergir).
                if (claims.get("communityId") instanceof Number communityId) {
                    TenantContext.setCommunityId(communityId.longValue());
                    tenantSetHere = true;
                }
            }
        } catch (JwtException | NumberFormatException ignored) {
            // token inválido — sem autenticação, a security chain retorna 401
        }
        try {
            chain.doFilter(request, response);
        } finally {
            // não confiar só no afterCompletion do MVC: se a chain barrar a
            // requisição antes do DispatcherServlet, o tenant vazaria no pool
            if (tenantSetHere) {
                TenantContext.clear();
            }
        }
    }
}
