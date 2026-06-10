package com.quilombo.auth;

import com.quilombo.common.exception.BusinessException;
import org.springframework.http.HttpStatus;

/** O e-mail autenticado pelo Google não está na allowlist de admins da comunidade. */
public class EmailNotAllowedException extends BusinessException {

    public EmailNotAllowedException() {
        super(HttpStatus.FORBIDDEN, "E-mail não autorizado para esta comunidade");
    }
}
