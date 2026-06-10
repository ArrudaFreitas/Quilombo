package com.quilombo.auth;

import com.quilombo.TestcontainersConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Round-trip real contra PostgreSQL (Testcontainers). {@code ddl-auto=validate}
 * confirma que a entidade LoginCode bate com a migration V2.
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
@ActiveProfiles("dev")
@TestPropertySource(properties = "spring.jpa.hibernate.ddl-auto=validate")
class AuthTokenExchangeIntegrationTest {

    @Autowired
    AuthService authService;

    @Autowired
    LoginCodeRepository repository;

    @Test
    void issues_and_exchanges_code_for_jwt_exactly_once() {
        repository.deleteAll();

        var code = authService.issueLoginCode("admin@example.com", "Admin");
        assertThat(repository.count()).isEqualTo(1);

        var jwt = authService.exchangeCodeForToken(code);
        assertThat(jwt).isNotBlank();
        assertThat(repository.count()).isZero(); // uso único: consumido na troca

        assertThatThrownBy(() -> authService.exchangeCodeForToken(code))
                .isInstanceOf(InvalidLoginCodeException.class);
    }

    @Test
    void rejects_unknown_code() {
        assertThatThrownBy(() -> authService.exchangeCodeForToken("codigo-inexistente"))
                .isInstanceOf(InvalidLoginCodeException.class);
    }

    @Test
    void rejects_expired_code_and_purges_it_on_next_issue() {
        repository.deleteAll();
        var code = authService.issueLoginCode("admin@example.com", "Admin");

        var stored = repository.findAll().getFirst();
        stored.setExpiresAt(Instant.now().minusSeconds(120));
        repository.save(stored);

        assertThatThrownBy(() -> authService.exchangeCodeForToken(code))
                .isInstanceOf(InvalidLoginCodeException.class);

        // a limpeza oportunista remove o código expirado ao emitir o próximo
        authService.issueLoginCode("outro@example.com", "Outro");
        assertThat(repository.findAll())
                .singleElement()
                .extracting(LoginCode::getExpiresAt)
                .matches(expiry -> expiry.isAfter(Instant.now()));
    }
}
