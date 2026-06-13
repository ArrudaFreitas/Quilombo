package com.quilombo.media;

import com.quilombo.common.exception.BusinessException;
import org.springframework.http.HttpStatus;

/** Arquivo enviado acima do limite por upload (antes do processamento). */
public class UploadTooLargeException extends BusinessException {

    public UploadTooLargeException(long maxBytes) {
        super(HttpStatus.PAYLOAD_TOO_LARGE,
                "Arquivo muito grande. Máximo: " + (maxBytes / (1024 * 1024)) + " MB");
    }
}
