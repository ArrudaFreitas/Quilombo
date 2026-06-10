package com.quilombo.auth;

import com.quilombo.security.JwtService;
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
 * apenas o seu hash. O frontend troca o código por um JWT em {@link #exchangeCodeForToken},
 * que consome o código atomicamente (uso único) e cunha o token só nesse momento.
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    private static final Duration CODE_TTL = Duration.ofSeconds(60);

    private final LoginCodeRepository repository;
    private final JwtService jwtService;
    private final SecureRandom secureRandom = new SecureRandom();

    @Transactional
    public String issueLoginCode(String subject, String name) {
        repository.deleteExpired(Instant.now());

        var rawCode = generateRawCode();
        var loginCode = new LoginCode();
        loginCode.setCodeHash(sha256Hex(rawCode));
        loginCode.setSubject(subject);
        loginCode.setName(name != null ? name : "");
        loginCode.setExpiresAt(Instant.now().plus(CODE_TTL));
        repository.save(loginCode);

        return rawCode;
    }

    @Transactional
    public String exchangeCodeForToken(String rawCode) {
        var loginCode = repository.findByCodeHash(sha256Hex(rawCode))
                .orElseThrow(InvalidLoginCodeException::new);

        // Expirado: rejeita sem consumir — lançar faria rollback de qualquer delete.
        // A linha é removida pela limpeza oportunista no próximo issueLoginCode.
        if (loginCode.getExpiresAt().isBefore(Instant.now())) {
            throw new InvalidLoginCodeException();
        }

        // Consumo atômico: numa corrida concorrente, só uma transação deleta 1 linha.
        if (repository.consumeById(loginCode.getId()) == 0) {
            throw new InvalidLoginCodeException();
        }

        return jwtService.generateToken(loginCode.getSubject(),
                Map.of("name", loginCode.getName()));
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
