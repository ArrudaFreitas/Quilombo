package com.quilombo.media;

import com.quilombo.common.exception.BusinessException;
import org.springframework.http.HttpStatus;

/** Arquivo que não é imagem ou cujo conteúdo não pôde ser processado. */
public class InvalidImageException extends BusinessException {

    public InvalidImageException(String message) {
        super(HttpStatus.BAD_REQUEST, message);
    }
}
