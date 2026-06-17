package com.quilombo.auth;

import com.quilombo.common.exception.BusinessException;
import org.springframework.http.HttpStatus;

/** O login exige o subdomínio da comunidade (a allowlist de admins é por tenant). */
public class TenantRequiredException extends BusinessException {

    public TenantRequiredException() {
        super(HttpStatus.BAD_REQUEST, "O login exige o subdomínio da comunidade");
    }
}
