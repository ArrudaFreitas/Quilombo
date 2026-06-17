package com.quilombo.auth;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.quilombo.config.AppProperties;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.Collections;

/**
 * Verificação do idToken via {@link GoogleIdTokenVerifier} (lib oficial recomendada pelo Google):
 * confere a assinatura contra as chaves públicas do Google, {@code aud} = nosso client-id,
 * {@code iss} (accounts.google.com) e {@code exp}. Exige {@code email_verified} antes de confiar
 * no e-mail — é por ele que a allowlist da comunidade autoriza o admin.
 */
@Component
class GoogleTokenVerifierImpl implements GoogleTokenVerifier {

    private final GoogleIdTokenVerifier verifier;

    GoogleTokenVerifierImpl(AppProperties appProperties) {
        this.verifier = new GoogleIdTokenVerifier.Builder(
                new NetHttpTransport(), GsonFactory.getDefaultInstance())
                .setAudience(Collections.singletonList(appProperties.auth().googleClientId()))
                .build();
    }

    @Override
    public GoogleUser verify(String idToken) {
        GoogleIdToken token;
        try {
            // null = assinatura/aud/iss/exp inválidos; exceção = falha de transporte/cripto
            // ou, no parse, IllegalArgumentException quando o idToken é malformado/vazio —
            // todas são "token inválido" (401), nunca um 500.
            token = verifier.verify(idToken);
        } catch (GeneralSecurityException | IOException | IllegalArgumentException e) {
            throw new InvalidGoogleTokenException();
        }
        if (token == null) {
            throw new InvalidGoogleTokenException();
        }

        var payload = token.getPayload();
        if (!Boolean.TRUE.equals(payload.getEmailVerified())) {
            throw new InvalidGoogleTokenException();
        }

        var email = payload.getEmail();
        var sub = payload.getSubject();
        if (email == null || sub == null) {
            throw new InvalidGoogleTokenException();
        }
        var name = (String) payload.get("name");
        return new GoogleUser(email, sub, name != null ? name : "");
    }
}
