package com.quilombo.auth;

import com.quilombo.auth.dto.MeResponse;
import com.quilombo.community.CommunityRepository;
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
 * Emissão e troca dos códigos de login de uso único.
 *
 * <p>No sucesso do OAuth, {@link #issueLoginCode} gera um código opaco e guarda
 * apenas o seu hash + o HMAC do e-mail verificado pelo Google. O callback chega
 * no domínio raiz (o redirect URI do Google é fixo), então <b>sem tenant</b> —
 * a autorização acontece na troca.
 *
 * <p>{@link #exchangeCodeForToken} roda no subdomínio da comunidade (tenant
 * resolvido pelo interceptor): o e-mail precisa estar na allowlist de admins
 * <b>daquela</b> comunidade ({@code @TenantId} + RLS restringem a busca). Sem
 * allowlist não há JWT. A recusa por allowlist (403) não consome o código — o
 * admin que errou de subdomínio pode trocar no certo dentro do TTL; o consumo
 * (uso único, atômico) acontece só no sucesso.
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    private static final Duration CODE_TTL = Duration.ofSeconds(60);

    private final LoginCodeRepository repository;
    private final AdminRepository adminRepository;
    private final CommunityRepository communityRepository;
    private final EmailHasher emailHasher;
    private final JwtService jwtService;
    private final SecureRandom secureRandom = new SecureRandom();

    @Transactional
    public String issueLoginCode(String email, String name) {
        repository.deleteExpired(Instant.now());

        var rawCode = generateRawCode();
        var loginCode = new LoginCode();
        loginCode.setCodeHash(sha256Hex(rawCode));
        loginCode.setEmailHash(emailHasher.hash(email));
        loginCode.setName(name != null ? name : "");
        loginCode.setExpiresAt(Instant.now().plus(CODE_TTL));
        repository.save(loginCode);

        return rawCode;
    }

    @Transactional
    public String exchangeCodeForToken(String rawCode) {
        var communityId = TenantContext.getCommunityId()
                .orElseThrow(TenantRequiredException::new);

        var loginCode = repository.findByCodeHash(sha256Hex(rawCode))
                .orElseThrow(InvalidLoginCodeException::new);

        // Expirado: rejeita sem consumir — lançar faria rollback de qualquer delete.
        // A linha é removida pela limpeza oportunista no próximo issueLoginCode.
        if (loginCode.getExpiresAt().isBefore(Instant.now())) {
            throw new InvalidLoginCodeException();
        }

        // Allowlist da comunidade do subdomínio (busca tenant-scoped).
        var admin = adminRepository.findByEmailHash(loginCode.getEmailHash())
                .orElseThrow(EmailNotAllowedException::new);

        // Consumo atômico: numa corrida concorrente, só uma transação deleta 1 linha.
        if (repository.consumeById(loginCode.getId()) == 0) {
            throw new InvalidLoginCodeException();
        }

        // sub = id do admin (sem PII); communityId ancora o token ao tenant.
        return jwtService.generateToken(admin.getId().toString(), Map.of(
                "communityId", communityId,
                "name", loginCode.getName()));
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

    private String generateRawCode() {
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
