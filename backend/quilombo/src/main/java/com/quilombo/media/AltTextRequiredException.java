package com.quilombo.media;

import com.quilombo.common.exception.BusinessException;
import org.springframework.http.HttpStatus;

/** Texto alternativo ausente ou em branco — obrigatório por acessibilidade. */
public class AltTextRequiredException extends BusinessException {

    public AltTextRequiredException() {
        super(HttpStatus.UNPROCESSABLE_ENTITY, "Texto alternativo é obrigatório");
    }
}
