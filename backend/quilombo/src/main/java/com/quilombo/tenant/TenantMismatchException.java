package com.quilombo.tenant;

import com.quilombo.common.exception.BusinessException;
import org.springframework.http.HttpStatus;

/** O tenant do JWT diverge da comunidade do subdomínio — token de outro tenant. */
public class TenantMismatchException extends BusinessException {

    public TenantMismatchException() {
        super(HttpStatus.FORBIDDEN, "Tenant do token diverge do subdomínio");
    }
}
