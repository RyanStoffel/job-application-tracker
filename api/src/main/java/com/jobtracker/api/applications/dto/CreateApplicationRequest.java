package com.jobtracker.api.applications.dto;

import com.jobtracker.api.applications.ApplicationStatus;
import com.jobtracker.api.applications.SalaryPeriod;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record CreateApplicationRequest(
        @NotBlank(message = "companyName must not be blank")
        String companyName,

        @NotBlank(message = "jobTitle must not be blank")
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

        String companyLogoUrl,

        @NotNull(message = "currentStatus is required")
        ApplicationStatus currentStatus
) {
}
