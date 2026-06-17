package com.quilombo.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Propriedades customizadas da aplicação, mapeadas do prefixo "app:" no application.yml.
 * Injetável em qualquer bean via construtor — preferível a @Value para grupos de configuração.
 */
@ConfigurationProperties(prefix = "app")
public record AppProperties(
        String baseDomain,
        StorageProperties storage,
        SectionsProperties sections,
        JwtProperties jwt,
        AuthProperties auth
) {

    public record AuthProperties(
            /* pepper do HMAC-SHA256 dos e-mails — sem ele não há lookup nem rainbow table */
            String emailHashSecret,
            /* validade da sessão longa (cookie de refresh rotacionado) */
            int refreshExpirationDays,
            /* Secure no cookie de refresh — false apenas em dev sem TLS */
            boolean cookieSecure,
            /* client-id do OAuth do Google — audiência esperada do idToken verificado */
            String googleClientId
    ) {}

    public record StorageProperties(
            /* quota de armazenamento por comunidade */
            long limitBytes,
            /* tamanho máximo do arquivo enviado, antes do processamento */
            long uploadMaxBytes,
            /* maior lado da imagem após o resize (sem ampliar) */
            int imageMaxDimension,
            /* endpoint S3-compatível (MinIO em dev, R2/S3 em prod); vazio = endpoint padrão da AWS */
            String endpoint,
            String accessKey,
            String secretKey,
            String bucket,
            String region,
            /* base pública dos objetos — o que vai nas URLs servidas ao navegador */
            String publicBaseUrl
    ) {}

    public record SectionsProperties(
            int limit
    ) {}

    public record JwtProperties(
            String secret,
            int expirationHours
    ) {}
}
