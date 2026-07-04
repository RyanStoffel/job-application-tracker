package com.jobtracker.api.applications.dto;

import com.jobtracker.api.applications.ApplicationStatus;
import jakarta.validation.constraints.NotNull;

public record StatusUpdateRequest(
        @NotNull(message = "status is required")
        ApplicationStatus status,

        String note
) {
}
