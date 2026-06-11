package com.quilombo.page;

import com.quilombo.common.exception.BusinessException;
import org.springframework.http.HttpStatus;

/** Seção inexistente no tenant atual (id desconhecido ou de outra comunidade). */
public class SectionNotFoundException extends BusinessException {

    public SectionNotFoundException() {
        super(HttpStatus.NOT_FOUND, "Seção não encontrada");
    }
}
