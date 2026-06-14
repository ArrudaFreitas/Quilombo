package com.quilombo.auth;

import com.quilombo.common.exception.BusinessException;
import org.springframework.http.HttpStatus;

/** idToken do Google ausente, malformado, expirado ou com assinatura/aud/iss inválidos. */
public class InvalidGoogleTokenException extends BusinessException {

    public InvalidGoogleTokenException() {
        super(HttpStatus.UNAUTHORIZED, "Token do Google inválido");
    }
}
