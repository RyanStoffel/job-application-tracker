package com.jobtracker.api.applications.dto;

import com.jobtracker.api.applications.ApplicationStatus;

import java.time.Instant;

public record StatusEventDto(
        String id,
        ApplicationStatus status,
        String note,
        Instant changedAt
) {
}
