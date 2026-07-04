package com.jobtracker.api.common.util;

import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Best-effort structured extraction from a free-text location string (e.g.
 * "Los Angeles, CA (Remote)"). Never throws — every field is null when it
 * can't be confidently determined, since the raw text remains the source of
 * truth for display (see docs/DATA_MODEL.md).
 */
public final class LocationParser {

    private LocationParser() {
    }

    private static final Pattern REMOTE_PATTERN = Pattern.compile("\\bremote\\b", Pattern.CASE_INSENSITIVE);
    private static final Pattern PARENTHETICAL_PATTERN = Pattern.compile("\\([^)]*\\)");

    private static final Set<String> US_STATE_CODES = Set.of(
            "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
            "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
            "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
            "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
            "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
            "DC"
    );

    public record Result(String city, String region, String country, Boolean isRemote) {
    }

    public static Result parse(String raw) {
        if (raw == null || raw.isBlank()) {
            return new Result(null, null, null, null);
        }

        boolean remote = REMOTE_PATTERN.matcher(raw).find();

        String withoutParens = PARENTHETICAL_PATTERN.matcher(raw).replaceAll(" ");
        String withoutRemoteKeyword = REMOTE_PATTERN.matcher(withoutParens).replaceAll(" ");
        String cleaned = withoutRemoteKeyword.replaceAll("\\s+", " ").trim();
        // Drop stray leading/trailing separators left over from stripping "(Remote)"/"Remote".
        cleaned = cleaned.replaceAll("^[,\\-\\s]+|[,\\-\\s]+$", "").trim();

        if (cleaned.isEmpty()) {
            return new Result(null, null, null, remote ? true : null);
        }

        List<String> parts = Arrays.stream(cleaned.split(","))
                .map(String::trim)
                .filter(part -> !part.isEmpty())
                .toList();

        String city = parts.size() >= 1 ? parts.get(0) : null;
        String region = parts.size() >= 2 ? parts.get(1) : null;
        String country = parts.size() >= 3 ? parts.get(2) : null;

        if (country == null && region != null && US_STATE_CODES.contains(region.toUpperCase())) {
            country = "United States";
        }

        return new Result(city, region, country, remote ? true : null);
    }
}
