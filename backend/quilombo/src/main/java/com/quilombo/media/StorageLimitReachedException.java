package com.quilombo.media;

import com.quilombo.common.exception.BusinessException;
import org.springframework.http.HttpStatus;

/** Upload excederia a quota de armazenamento da comunidade. */
public class StorageLimitReachedException extends BusinessException {

    public StorageLimitReachedException(long limitBytes) {
        super(HttpStatus.BAD_REQUEST,
                "Limite de armazenamento atingido (" + (limitBytes / (1024 * 1024)) + " MB)");
    }
}
