package com.quilombo.page;

import com.quilombo.common.exception.BusinessException;
import org.springframework.http.HttpStatus;

/** A página institucional só existe no subdomínio de uma comunidade. */
public class PageTenantRequiredException extends BusinessException {

    public PageTenantRequiredException() {
        super(HttpStatus.BAD_REQUEST, "A página institucional exige o subdomínio da comunidade");
    }
}
