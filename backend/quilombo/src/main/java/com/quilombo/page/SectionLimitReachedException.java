package com.quilombo.page;

import com.quilombo.common.exception.BusinessException;
import org.springframework.http.HttpStatus;

/** Tentativa de criar seção além do limite por comunidade. */
public class SectionLimitReachedException extends BusinessException {

    public SectionLimitReachedException(int limit) {
        super(HttpStatus.BAD_REQUEST, "Limite de " + limit + " seções atingido");
    }
}
