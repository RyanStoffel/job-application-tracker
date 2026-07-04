package com.jobtracker.api.applications.dto;

import com.jobtracker.api.applications.ApplicationSource;
import com.jobtracker.api.applications.ApplicationStatus;

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
        ApplicationStatus currentStatus,
        Instant createdAt,
        Instant updatedAt
) {
}
