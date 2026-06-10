package com.quilombo.tenant;

import com.quilombo.common.exception.BusinessException;
import org.springframework.http.HttpStatus;

/** Subdomínio aponta para uma comunidade inexistente. */
public class TenantNotFoundException extends BusinessException {

    public TenantNotFoundException(String slug) {
        super(HttpStatus.NOT_FOUND, "Comunidade não encontrada: " + slug);
    }
}
