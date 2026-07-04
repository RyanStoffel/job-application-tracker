package com.jobtracker.api.common.util;

import com.jobtracker.api.common.exception.BadRequestException;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Map;

/**
 * Canonicalizes listing URLs (e.g. from the LinkedIn extension ingestion
 * endpoint) by stripping the query string and fragment, so that the same
 * listing visited with different tracking parameters still dedupes to a
 * single (user_id, source_url) record.
 */
public final class UrlCanonicalizer {

    private UrlCanonicalizer() {
    }

    public static String canonicalize(String rawUrl) {
        if (rawUrl == null || rawUrl.isBlank()) {
            throw new BadRequestException("sourceUrl is required", Map.of("sourceUrl", "must not be blank"));
        }
        try {
            URI uri = new URI(rawUrl.trim());
            URI canonical = new URI(uri.getScheme(), uri.getAuthority(), uri.getPath(), null, null);
            return canonical.toString();
        } catch (URISyntaxException e) {
            throw new BadRequestException("sourceUrl is not a valid URL", Map.of("sourceUrl", "must be a valid URL"));
        }
    }
}
