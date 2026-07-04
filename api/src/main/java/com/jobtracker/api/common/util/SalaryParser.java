package com.jobtracker.api.common.util;

import com.jobtracker.api.applications.SalaryPeriod;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Best-effort structured extraction from a free-text salary string (e.g.
 * "$140,000 - $180,000", "$70/hr", "€60k"). Never throws — every field is
 * null when it can't be confidently determined, since the raw text remains
 * the source of truth for display (see docs/DATA_MODEL.md).
 */
public final class SalaryParser {

    private SalaryParser() {
    }

    private static final Pattern NUMBER_PATTERN =
            Pattern.compile("(\\d[\\d,]*(?:\\.\\d+)?)\\s*([kK])?");

    private static final Pattern HOURLY_PATTERN = Pattern.compile("/\\s*hr\\b|/\\s*hour\\b|per\\s+hour|hourly", Pattern.CASE_INSENSITIVE);
    private static final Pattern WEEKLY_PATTERN = Pattern.compile("/\\s*wk\\b|/\\s*week\\b|per\\s+week|weekly", Pattern.CASE_INSENSITIVE);
    private static final Pattern MONTHLY_PATTERN = Pattern.compile("/\\s*mo\\b|/\\s*month\\b|per\\s+month|monthly", Pattern.CASE_INSENSITIVE);
    private static final Pattern YEARLY_PATTERN = Pattern.compile("/\\s*yr\\b|/\\s*year\\b|per\\s+year|per\\s+annum|annually|yearly", Pattern.CASE_INSENSITIVE);

    public record Result(BigDecimal min, BigDecimal max, String currency, SalaryPeriod period) {
    }

    public static Result parse(String raw) {
        if (raw == null || raw.isBlank()) {
            return new Result(null, null, null, null);
        }

        String currency = detectCurrency(raw);
        List<BigDecimal> amounts = extractAmounts(raw);

        if (amounts.isEmpty()) {
            return new Result(null, null, currency, null);
        }

        BigDecimal min = amounts.get(0);
        BigDecimal max = amounts.size() > 1 ? amounts.get(1) : amounts.get(0);
        if (min.compareTo(max) > 0) {
            BigDecimal tmp = min;
            min = max;
            max = tmp;
        }

        SalaryPeriod period = detectPeriod(raw);
        if (period == null) {
            // Most listings with no explicit unit are quoting an annual figure.
            period = SalaryPeriod.YEARLY;
        }

        return new Result(min, max, currency, period);
    }

    private static String detectCurrency(String raw) {
        if (raw.contains("$")) return "USD";
        if (raw.contains("€")) return "EUR";
        if (raw.contains("£")) return "GBP";
        if (raw.toUpperCase().contains("USD")) return "USD";
        if (raw.toUpperCase().contains("EUR")) return "EUR";
        if (raw.toUpperCase().contains("GBP")) return "GBP";
        return null;
    }

    private static List<BigDecimal> extractAmounts(String raw) {
        List<BigDecimal> amounts = new ArrayList<>();
        Matcher matcher = NUMBER_PATTERN.matcher(raw);
        while (matcher.find() && amounts.size() < 2) {
            String numeric = matcher.group(1).replace(",", "");
            try {
                BigDecimal value = new BigDecimal(numeric);
                if (matcher.group(2) != null) {
                    value = value.multiply(BigDecimal.valueOf(1000));
                }
                amounts.add(value);
            } catch (NumberFormatException ignored) {
                // Skip anything that doesn't parse cleanly - never throw.
            }
        }
        return amounts;
    }

    private static SalaryPeriod detectPeriod(String raw) {
        if (HOURLY_PATTERN.matcher(raw).find()) return SalaryPeriod.HOURLY;
        if (WEEKLY_PATTERN.matcher(raw).find()) return SalaryPeriod.WEEKLY;
        if (MONTHLY_PATTERN.matcher(raw).find()) return SalaryPeriod.MONTHLY;
        if (YEARLY_PATTERN.matcher(raw).find()) return SalaryPeriod.YEARLY;
        return null;
    }
}
