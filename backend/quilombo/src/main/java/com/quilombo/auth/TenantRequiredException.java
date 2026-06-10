package com.quilombo.auth;

import com.quilombo.common.exception.BusinessException;
import org.springframework.http.HttpStatus;

/** A troca do código exige o subdomínio da comunidade (allowlist é por tenant). */
public class TenantRequiredException extends BusinessException {

    public TenantRequiredException() {
        super(HttpStatus.BAD_REQUEST, "A troca do código exige o subdomínio da comunidade");
    }
}
