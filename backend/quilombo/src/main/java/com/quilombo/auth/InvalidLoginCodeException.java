package com.quilombo.auth;

import com.quilombo.common.exception.BusinessException;
import org.springframework.http.HttpStatus;

/** Código de login ausente do store, já consumido ou expirado. */
public class InvalidLoginCodeException extends BusinessException {

    public InvalidLoginCodeException() {
        super(HttpStatus.UNAUTHORIZED, "Código de login inválido ou expirado");
    }
}
