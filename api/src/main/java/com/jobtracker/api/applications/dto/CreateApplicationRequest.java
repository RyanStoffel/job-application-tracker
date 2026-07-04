package com.jobtracker.api.applications.dto;

import com.jobtracker.api.applications.ApplicationStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateApplicationRequest(
        @NotBlank(message = "companyName must not be blank")
        String companyName,

        @NotBlank(message = "jobTitle must not be blank")
        String jobTitle,

        String sourceUrl,
        String locationText,
        String salaryText,
        String appliedAt,

        @NotNull(message = "currentStatus is required")
        ApplicationStatus currentStatus
) {
}
