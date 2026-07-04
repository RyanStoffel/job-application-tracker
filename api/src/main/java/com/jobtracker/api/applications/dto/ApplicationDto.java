package com.jobtracker.api.applications.dto;

import com.jobtracker.api.applications.ApplicationSource;
import com.jobtracker.api.applications.ApplicationStatus;
import com.jobtracker.api.applications.SalaryPeriod;

import java.math.BigDecimal;
import java.time.Instant;

public record ApplicationDto(
        String id,
        ApplicationSource source,
        String sourceUrl,
        String companyName,
        String jobTitle,
        String locationText,
        String salaryText,
        Instant appliedAt,
        Instant postedAt,
        String locationCity,
        String locationRegion,
        String locationCountry,
        Boolean isRemote,
        BigDecimal salaryMin,
        BigDecimal salaryMax,
        String salaryCurrency,
        SalaryPeriod salaryPeriod,
        String companyLogoUrl,
        String duplicateOfId,
        ApplicationStatus currentStatus,
        Instant createdAt,
        Instant updatedAt
) {
}
