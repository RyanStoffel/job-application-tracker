package com.jobtracker.api.common.exception;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.Map;

/**
 * Standard error shape used across the API:
 * {@code { "message": "...", "errors": { "field": "issue" } } }.
 * {@code errors} is omitted when there are no field-level validation errors.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ErrorResponse(String message, Map<String, String> errors) {

    public static ErrorResponse of(String message) {
        return new ErrorResponse(message, null);
    }

    public static ErrorResponse of(String message, Map<String, String> errors) {
        return new ErrorResponse(message, errors);
    }
}
