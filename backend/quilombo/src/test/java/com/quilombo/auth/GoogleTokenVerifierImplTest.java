package com.quilombo.auth;

import com.quilombo.config.AppProperties;
import com.quilombo.config.AppProperties.AuthProperties;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThatExceptionOfType;

/**
 * Um idToken malformado/vazio faz a lib do Google lançar {@code IllegalArgumentException}
 * já no parse (antes de qualquer chamada de rede). Sem o catch dela, a exceção escaparia
 * como 500 — e o front mostraria o erro genérico em vez do "token inválido". Aqui
 * garantimos que vira {@link InvalidGoogleTokenException} (401), o erro de cliente correto.
 *
 * <p>(Token bem-formado mas com aud/assinatura/exp inválidos devolve {@code null} →
 * também 401, coberto pelos testes web de login.)
 */
class GoogleTokenVerifierImplTest {

    private final GoogleTokenVerifierImpl verifier = new GoogleTokenVerifierImpl(
            new AppProperties(null, null, null, null,
                    new AuthProperties(null, 14, false,
                            "test-client-id.apps.googleusercontent.com")));

    @ParameterizedTest
    @ValueSource(strings = {"", "bogus", "a.b", "header.payload", "a.b.c.d"})
    void malformed_idtoken_yields_unauthorized_not_500(String idToken) {
        assertThatExceptionOfType(InvalidGoogleTokenException.class)
                .isThrownBy(() -> verifier.verify(idToken));
    }
}
