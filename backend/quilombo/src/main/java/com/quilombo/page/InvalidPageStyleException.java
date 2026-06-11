package com.quilombo.page;

import com.quilombo.common.exception.BusinessException;
import org.springframework.http.HttpStatus;

/** Estilo fora do catálogo ou paleta não disponível para o estilo escolhido. */
public class InvalidPageStyleException extends BusinessException {

    public InvalidPageStyleException(String message) {
        super(HttpStatus.BAD_REQUEST, message);
    }
}
