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
        JwtProperties jwt
) {

    public record StorageProperties(
            long limitBytes,
            long uploadMaxBytes,
            int imageMaxDimension
    ) {}

    public record SectionsProperties(
            int limit
    ) {}

    public record JwtProperties(
            String secret,
            int expirationHours
    ) {}
}
