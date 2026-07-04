package com.jobtracker.api.common.exception;

import org.springframework.http.HttpStatus;

import java.util.Map;

/**
 * Base type for exceptions that should be translated into the API's
 * standard error JSON shape by {@link GlobalExceptionHandler}.
 */
public abstract class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final transient Map<String, String> errors;

    protected ApiException(HttpStatus status, String message) {
        this(status, message, null);
    }

    protected ApiException(HttpStatus status, String message, Map<String, String> errors) {
        super(message);
        this.status = status;
        this.errors = errors;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public Map<String, String> getErrors() {
        return errors;
    }
}
