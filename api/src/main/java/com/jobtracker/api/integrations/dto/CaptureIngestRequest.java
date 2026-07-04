package com.jobtracker.api.integrations.dto;

import com.jobtracker.api.applications.SalaryPeriod;
import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;

/**
 * Shared request shape for both capture endpoints
 * (POST /api/integrations/linkedin and POST /api/integrations/capture).
 * Structured location/salary fields are optional overrides for future
 * extractors (e.g. Phase 2 ATS parsers) that already have structured data;
 * when absent, {@link com.jobtracker.api.integrations.IngestionService}
 * derives them from the raw text.
 */
public record CaptureIngestRequest(
        @NotBlank(message = "sourceUrl must not be blank")
        String sourceUrl,

        @NotBlank(message = "companyName must not be blank")
        String companyName,

        @NotBlank(message = "jobTitle must not be blank")
        String jobTitle,

        String locationText,
        String salaryText,
        String postedAt,
        String appliedAt,
        String companyLogoUrl,

        String locationCity,
        String locationRegion,
        String locationCountry,
        Boolean isRemote,

        BigDecimal salaryMin,
        BigDecimal salaryMax,
        String salaryCurrency,
        SalaryPeriod salaryPeriod
) {
}
