package com.quilombo.auth;

import com.quilombo.auth.dto.MeResponse;
import com.quilombo.community.CommunityRepository;
import com.quilombo.config.AppProperties;
import com.quilombo.security.JwtPrincipal;
import com.quilombo.security.JwtService;
import com.quilombo.tenant.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Map;

/**
 * Login (Google idToken → JWT), refresh com rotação e logout.
 *
 * <p>{@link #loginWithGoogle} roda no subdomínio da comunidade (tenant resolvido pelo
 * interceptor): o front obtém o idToken via Google Identity Services e o envia; aqui ele é
 * verificado ({@link GoogleTokenVerifier}) e o e-mail precisa estar na allowlist de admins
 * <b>daquela</b> comunidade ({@code @TenantId} + RLS restringem a busca). Sem allowlist não
 * há JWT — e nada do Google é persistido além do HMAC do e-mail, já materializado na allowlist.
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    private final GoogleTokenVerifier googleTokenVerifier;
    private final AdminRepository adminRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final CommunityRepository communityRepository;
    private final EmailHasher emailHasher;
    private final JwtService jwtService;
    private final AppProperties appProperties;
    private final SecureRandom secureRandom = new SecureRandom();

    @Transactional
    public TokenPair loginWithGoogle(String idToken) {
        var communityId = TenantContext.getCommunityId()
                .orElseThrow(TenantRequiredException::new);

        // Verifica assinatura/aud/iss/exp e email_verified — 401 se inválido.
        var google = googleTokenVerifier.verify(idToken);

        // Allowlist da comunidade do subdomínio (busca tenant-scoped via @TenantId + RLS).
        var admin = adminRepository.findByEmailHash(emailHasher.hash(google.email()))
                .orElseThrow(EmailNotAllowedException::new);

        return issueTokens(admin.getId(), communityId, google.name());
    }

    /**
     * Rotação: consome o refresh atual atomicamente e emite outro par. Reuso de um
     * token já rotacionado falha. A allowlist é revalidada — admin removido perde
     * também a sessão longa. Expirado é rejeitado sem deletar (lançar faria
     * rollback); a limpeza oportunista em {@link #issueTokens} o remove depois.
     */
    @Transactional
    public TokenPair refresh(String rawRefreshToken) {
        var communityId = TenantContext.getCommunityId()
                .orElseThrow(TenantRequiredException::new);
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw new InvalidRefreshTokenException();
        }

        var stored = refreshTokenRepository.findByTokenHash(sha256Hex(rawRefreshToken))
                .orElseThrow(InvalidRefreshTokenException::new);
        if (stored.getExpiresAt().isBefore(Instant.now())) {
            throw new InvalidRefreshTokenException();
        }
        if (refreshTokenRepository.consumeById(stored.getId()) == 0) {
            throw new InvalidRefreshTokenException();
        }

        var admin = adminRepository.findById(stored.getAdminId())
                .orElseThrow(InvalidSessionException::new);

        return issueTokens(admin.getId(), communityId, stored.getName());
    }

    /** Revoga a sessão longa pelo cookie — idempotente, tokens desconhecidos são ignorados. */
    @Transactional
    public void logout(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            return;
        }
        refreshTokenRepository.deleteByTokenHash(sha256Hex(rawRefreshToken));
    }

    private TokenPair issueTokens(Long adminId, Long communityId, String name) {
        refreshTokenRepository.deleteExpired(Instant.now());

        // sub = id do admin (sem PII); communityId ancora o token ao tenant.
        var accessToken = jwtService.generateToken(adminId.toString(), Map.of(
                "communityId", communityId,
                "name", name));

        var rawRefreshToken = generateOpaqueToken();
        var refreshToken = new RefreshToken();
        refreshToken.setTokenHash(sha256Hex(rawRefreshToken));
        refreshToken.setAdminId(adminId);
        refreshToken.setName(name);
        refreshToken.setExpiresAt(Instant.now().plus(
                Duration.ofDays(appProperties.auth().refreshExpirationDays())));
        refreshTokenRepository.save(refreshToken);

        return new TokenPair(accessToken, rawRefreshToken);
    }

    /**
     * Sessão atual do admin autenticado. Revalida contra o banco: se o admin foi
     * removido da allowlist após a emissão do token, o RLS/{@code @TenantId} não o
     * encontra mais e a sessão é recusada — revogação efetiva sem blocklist de JWT.
     */
    @Transactional(readOnly = true)
    public MeResponse me(JwtPrincipal principal) {
        var communityId = TenantContext.getCommunityId()
                .orElseThrow(InvalidSessionException::new);
        var admin = adminRepository.findById(principal.adminId())
                .orElseThrow(InvalidSessionException::new);
        var community = communityRepository.findById(communityId)
                .orElseThrow(InvalidSessionException::new);
        return new MeResponse(admin.getId(), principal.name(), community.getSlug());
    }

    private String generateOpaqueToken() {
        var bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String sha256Hex(String input) {
        try {
            var digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(input.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 indisponível", e);
        }
    }
}
