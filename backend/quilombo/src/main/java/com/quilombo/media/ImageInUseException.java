package com.quilombo.media;

import com.quilombo.common.exception.BusinessException;
import org.springframework.http.HttpStatus;

/** Tentativa de remover imagem ainda referenciada por uma seção ou pelo card. */
public class ImageInUseException extends BusinessException {

    public ImageInUseException() {
        super(HttpStatus.CONFLICT,
                "Imagem em uso por uma seção ou card — remova o uso antes de deletar");
    }
}
