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
 * Login centralizado (Google idToken → sessão), refresh com rotação e logout.
 *
 * <p>Separa <b>identidade</b> (quem é, verificado pelo Google) de <b>autorização</b> (admin
 * de qual comunidade, pela allowlist por-tenant). {@link #loginWithGoogle} verifica o idToken
 * e emite sempre um <b>token de identidade</b> (cookie no domínio-pai, compartilhado pelos
 * subdomínios) — por isso o Google só precisa de <b>uma origem</b> registrada (o ápice), não
 * uma por comunidade. Se o login acontece direto num subdomínio (há tenant no contexto), também
 * cunha a sessão daquela comunidade. O bootstrap nas demais comunidades acontece em
 * {@link #refresh}: a partir da identidade, checa a allowlist <b>daquele</b> tenant e emite a
 * sessão por-tenant (rotacionada, RLS) — ou a recusa (403) se o e-mail não for admin ali.
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
    public LoginResult loginWithGoogle(String idToken) {
        // Verifica assinatura/aud/iss/exp e email_verified — 401 se inválido.
        var google = googleTokenVerifier.verify(idToken);
        var emailHash = emailHasher.hash(google.email());

        // Identidade (sem tenant): habilita o SSO entre subdomínios via cookie do pai.
        var identityToken = issueIdentityToken(emailHash, google.name());

        // Login direto num subdomínio: também cunha a sessão daquele tenant (exige allowlist).
        var tenant = TenantContext.getCommunityId();
        if (tenant.isEmpty()) {
            return new LoginResult(identityToken, null);
        }
        var admin = adminRepository.findByEmailHash(emailHash)
                .orElseThrow(EmailNotAllowedException::new);
        return new LoginResult(identityToken, issueTokens(admin.getId(), tenant.get(), google.name()));
    }

    /**
     * Renova/bootstrapa a sessão do tenant atual. Caminho 1: refresh por-tenant rotacionado
     * (consome atômico, reuso falha, RLS). Caminho 2 (sem refresh por-tenant válido): a partir
     * do <b>cookie de identidade</b>, checa a allowlist <b>deste</b> tenant e cunha a sessão —
     * é o que faz o SSO funcionar ao entrar numa comunidade pela primeira vez. A allowlist é
     * sempre revalidada: admin removido perde a sessão (403/sessão inválida).
     */
    @Transactional
    public TokenPair refresh(String rawRefreshToken, String identityToken) {
        var communityId = TenantContext.getCommunityId()
                .orElseThrow(TenantRequiredException::new);

        // 1) refresh por-tenant rotacionado (caminho padrão após o bootstrap)
        if (rawRefreshToken != null && !rawRefreshToken.isBlank()) {
            var stored = refreshTokenRepository.findByTokenHash(sha256Hex(rawRefreshToken))
                    .filter(token -> !token.getExpiresAt().isBefore(Instant.now()))
                    .orElse(null);
            if (stored != null && refreshTokenRepository.consumeById(stored.getId()) > 0) {
                var admin = adminRepository.findById(stored.getAdminId())
                        .orElseThrow(InvalidSessionException::new);
                return issueTokens(admin.getId(), communityId, stored.getName());
            }
            // refresh ausente do store/expirado/já consumido → tenta a identidade (re-bootstrap)
        }

        // 2) bootstrap a partir da identidade: allowlist DESTE tenant decide
        var identity = parseIdentity(identityToken);
        if (identity == null) {
            throw new InvalidRefreshTokenException();
        }
        var admin = adminRepository.findByEmailHash(identity.emailHash())
                .orElseThrow(EmailNotAllowedException::new);
        return issueTokens(admin.getId(), communityId, identity.name());
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

    /** Token de identidade (JWT longo, cookie do domínio-pai): subject = HMAC do e-mail. */
    private String issueIdentityToken(String emailHash, String name) {
        return jwtService.generateToken(emailHash, Map.of(
                        "typ", "identity",
                        "name", name),
                Duration.ofDays(appProperties.auth().refreshExpirationDays()));
    }

    /** Lê e valida o cookie de identidade; devolve {@code null} se ausente/inválido/expirado. */
    private Identity parseIdentity(String identityToken) {
        if (identityToken == null || identityToken.isBlank()) {
            return null;
        }
        try {
            var claims = jwtService.parseToken(identityToken);
            if (!"identity".equals(claims.get("typ", String.class))) {
                return null;
            }
            var name = claims.get("name", String.class);
            return new Identity(claims.getSubject(), name != null ? name : "");
        } catch (RuntimeException e) {
            return null; // assinatura inválida, expirado ou malformado
        }
    }

    private record Identity(String emailHash, String name) {}

    /** Resultado do login: token de identidade (sempre) + sessão por-tenant (se houver tenant). */
    public record LoginResult(String identityToken, TokenPair tokens) {}
}
