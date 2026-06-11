package com.quilombo.page;

import com.quilombo.common.exception.BusinessException;
import org.springframework.http.HttpStatus;

/** Tipo de seção fora do catálogo {@link SectionType}. */
public class InvalidSectionTypeException extends BusinessException {

    public InvalidSectionTypeException() {
        super(HttpStatus.BAD_REQUEST, "Tipo de seção inválido");
    }
}
