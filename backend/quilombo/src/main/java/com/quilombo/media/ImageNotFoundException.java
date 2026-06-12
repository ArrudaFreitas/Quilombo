package com.quilombo.media;

import com.quilombo.common.exception.BusinessException;
import org.springframework.http.HttpStatus;

/** Imagem inexistente no tenant atual (filename desconhecido ou de outra comunidade). */
public class ImageNotFoundException extends BusinessException {

    public ImageNotFoundException() {
        super(HttpStatus.NOT_FOUND, "Imagem não encontrada");
    }
}
