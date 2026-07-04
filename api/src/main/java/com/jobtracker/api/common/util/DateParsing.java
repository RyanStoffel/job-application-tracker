package com.jobtracker.api.common.util;

import com.jobtracker.api.common.exception.BadRequestException;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.Map;

/**
 * Parses date/date-time strings coming from clients (web app form fields or
 * the browser extension) into {@link Instant}. Accepts full ISO-8601
 * instants (e.g. {@code 2026-07-01T12:00:00Z}) as well as bare ISO dates
 * (e.g. {@code 2026-07-01}), since clients may only have a date to offer.
 */
public final class DateParsing {

    private DateParsing() {
    }

    public static Instant parseFlexibleInstant(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Instant.parse(value);
        } catch (DateTimeParseException ignored) {
            // fall through to date-only parsing
        }
        try {
            return LocalDate.parse(value).atStartOfDay(ZoneOffset.UTC).toInstant();
        } catch (DateTimeParseException e) {
            throw new BadRequestException("Invalid date value", Map.of(fieldName, "must be a valid ISO-8601 date or date-time"));
        }
    }
}
