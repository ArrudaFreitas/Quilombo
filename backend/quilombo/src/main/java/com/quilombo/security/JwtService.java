package com.quilombo.security;

import com.quilombo.config.AppProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class JwtService {

    private final AppProperties appProperties;

    /** Access token curto (validade de {@code app.jwt.expiration-hours}). */
    public String generateToken(String subject, Map<String, Object> extraClaims) {
        return generateToken(subject, extraClaims,
                Duration.ofHours(appProperties.jwt().expirationHours()));
    }

    /** Token com validade explícita — usado pelo cookie de identidade (sessão longa). */
    public String generateToken(String subject, Map<String, Object> extraClaims, Duration ttl) {
        var now = Instant.now();
        var builder = Jwts.builder()
                .subject(subject)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(ttl)))
                .signWith(signingKey());
        extraClaims.forEach(builder::claim);
        return builder.compact();
    }

    public Claims parseToken(String token) {
        return Jwts.parser()
                .verifyWith(signingKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private SecretKey signingKey() {
        return Keys.hmacShaKeyFor(
                appProperties.jwt().secret().getBytes(StandardCharsets.UTF_8));
    }
}
