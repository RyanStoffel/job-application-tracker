package com.jobtracker.api.applications.dto;

import com.jobtracker.api.applications.SalaryPeriod;

import java.math.BigDecimal;

/**
 * Partial update of the editable application fields. {@code currentStatus}
 * is intentionally not present here - per the API contract, status changes
 * must go through POST /api/applications/{id}/status so a status-history
 * event is always recorded.
 * <p>
 * Note: a field left {@code null} is treated as "no change" rather than
 * "clear this field" - a simplification for the MVP. A future iteration
 * could use tri-state wrappers (e.g. JsonNullable) to distinguish "absent"
 * from "explicitly null".
 */
public record UpdateApplicationRequest(
        String companyName,
        String jobTitle,
        String sourceUrl,
        String locationText,
        String salaryText,
        String appliedAt,
        String postedAt,

        String locationCity,
        String locationRegion,
        String locationCountry,
        Boolean isRemote,

        BigDecimal salaryMin,
        BigDecimal salaryMax,
        String salaryCurrency,
        SalaryPeriod salaryPeriod,

        String companyLogoUrl
) {
}
