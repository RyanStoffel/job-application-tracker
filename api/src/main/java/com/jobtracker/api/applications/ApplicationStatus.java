package com.jobtracker.api.applications;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/** The 6-value status taxonomy defined in docs/AGENTS.md. */
public enum ApplicationStatus {
    SAVED,
    APPLIED,
    INTERVIEWING,
    REJECTED,
    GHOSTED,
    OFFER;

    @JsonValue
    public String toJson() {
        return name().toLowerCase();
    }

    @JsonCreator
    public static ApplicationStatus fromJson(String value) {
        if (value == null) {
            return null;
        }
        return ApplicationStatus.valueOf(value.trim().toUpperCase());
    }
}
