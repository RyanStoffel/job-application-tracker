package com.jobtracker.api.integrations.dto;

import jakarta.validation.constraints.NotBlank;

public record LinkedInIngestRequest(
        @NotBlank(message = "sourceUrl must not be blank")
        String sourceUrl,

        @NotBlank(message = "companyName must not be blank")
        String companyName,

        @NotBlank(message = "jobTitle must not be blank")
        String jobTitle,

        String locationText,
        String salaryText,
        String postedAt
) {
}
