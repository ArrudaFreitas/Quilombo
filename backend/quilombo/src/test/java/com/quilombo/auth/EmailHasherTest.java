package com.quilombo.auth;

import com.quilombo.config.AppProperties;
import com.quilombo.config.AppProperties.AuthProperties;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class EmailHasherTest {

    private final EmailHasher hasher = hasherWithSecret("segredo-a");

    @Test
    void is_deterministic_for_lookup_by_equality() {
        assertThat(hasher.hash("maria@example.com"))
                .isEqualTo(hasher.hash("maria@example.com"));
    }

    @Test
    void normalizes_case_and_whitespace_before_hashing() {
        var expected = hasher.hash("maria@example.com");
        assertThat(hasher.hash("  Maria@Example.COM  ")).isEqualTo(expected);
    }

    @Test
    void produces_64_hex_chars() {
        assertThat(hasher.hash("maria@example.com")).matches("[0-9a-f]{64}");
    }

    @Test
    void different_secrets_produce_different_hashes() {
        var other = hasherWithSecret("segredo-b");
        assertThat(hasher.hash("maria@example.com"))
                .isNotEqualTo(other.hash("maria@example.com"));
    }

    private static EmailHasher hasherWithSecret(String secret) {
        return new EmailHasher(new AppProperties(
                null, null, null, null, new AuthProperties(secret, 14, false, "test-client-id")));
    }
}
