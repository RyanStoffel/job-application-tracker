package com.jobtracker.api.common.exception;

import org.springframework.http.HttpStatus;

public class InvalidCredentialsException extends ApiException {
    public InvalidCredentialsException(String message) {
        super(HttpStatus.UNAUTHORIZED, message);
    }
}
