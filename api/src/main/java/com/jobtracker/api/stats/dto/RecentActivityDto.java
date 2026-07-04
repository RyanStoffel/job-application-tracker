package com.jobtracker.api.stats.dto;

import com.jobtracker.api.applications.ApplicationStatus;

import java.time.Instant;

/** {@code StatusEvent & { applicationId, companyName, jobTitle }} per the API contract. */
public record RecentActivityDto(
        String id,
        ApplicationStatus status,
        String note,
        Instant changedAt,
        String applicationId,
        String companyName,
        String jobTitle
) {
}
