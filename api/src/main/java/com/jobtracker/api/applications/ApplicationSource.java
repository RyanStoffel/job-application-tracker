package com.jobtracker.api.applications;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum ApplicationSource {
    LINKEDIN,
    MANUAL;

    @JsonValue
    public String toJson() {
        return name().toLowerCase();
    }

    @JsonCreator
    public static ApplicationSource fromJson(String value) {
        if (value == null) {
            return null;
        }
        return ApplicationSource.valueOf(value.trim().toUpperCase());
    }
}
