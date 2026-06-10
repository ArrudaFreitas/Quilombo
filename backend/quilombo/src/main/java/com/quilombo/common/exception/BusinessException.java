package com.quilombo.common.exception;

import org.springframework.http.HttpStatus;

/**
 * Base para exceções de negócio. Carrega o status HTTP que o
 * {@link GlobalExceptionHandler} traduz em RFC 7807 (ProblemDetail).
 *
 * <p>Features definem subclasses concretas (ex.: recurso não encontrado, conflito).
 */
public abstract class BusinessException extends RuntimeException {

    private final HttpStatus status;

    protected BusinessException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
