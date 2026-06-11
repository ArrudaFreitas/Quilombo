package com.quilombo.auth;

import com.quilombo.config.AppProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Locale;

/**
 * Identificador pseudonimizado do e-mail (LGPD): HMAC-SHA256 com segredo do
 * servidor, em hex (64 chars). Determinístico — mesmo e-mail gera sempre o mesmo
 * hash, permitindo busca por igualdade com índice — e irrecuperável sem o segredo
 * (BCrypt não serve aqui: o salt aleatório impede o lookup).
 *
 * <p>O e-mail é normalizado (trim + minúsculas) antes do HMAC, para que variações
 * de caixa vindas do provedor não gerem identidades distintas.
 */
@Component
@RequiredArgsConstructor
public class EmailHasher {

    private static final String ALGORITHM = "HmacSHA256";

    private final AppProperties appProperties;

    public String hash(String email) {
        var normalized = email.trim().toLowerCase(Locale.ROOT);
        try {
            var mac = Mac.getInstance(ALGORITHM);
            mac.init(new SecretKeySpec(
                    appProperties.auth().emailHashSecret().getBytes(StandardCharsets.UTF_8),
                    ALGORITHM));
            return HexFormat.of().formatHex(mac.doFinal(normalized.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new IllegalStateException("HMAC-SHA256 indisponível", e);
        }
    }
}
