package com.jobtracker.api.applications;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum SalaryPeriod {
    YEARLY,
    MONTHLY,
    WEEKLY,
    HOURLY;

    @JsonValue
    public String toJson() {
        return name().toLowerCase();
    }

    @JsonCreator
    public static SalaryPeriod fromJson(String value) {
        if (value == null) {
            return null;
        }
        return SalaryPeriod.valueOf(value.trim().toUpperCase());
    }
}
