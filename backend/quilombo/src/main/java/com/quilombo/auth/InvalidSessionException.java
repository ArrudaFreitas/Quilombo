package com.quilombo.auth;

import com.quilombo.common.exception.BusinessException;
import org.springframework.http.HttpStatus;

/** Sessão ausente, token sem principal ou admin removido da allowlist. */
public class InvalidSessionException extends BusinessException {

    public InvalidSessionException() {
        super(HttpStatus.UNAUTHORIZED, "Sessão inválida");
    }
}
