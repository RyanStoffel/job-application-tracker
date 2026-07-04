package com.jobtracker.api.applications;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/** Persists {@link ApplicationStatus} as the lowercase strings used by the DB CHECK constraints. */
@Converter(autoApply = true)
public class ApplicationStatusConverter implements AttributeConverter<ApplicationStatus, String> {

    @Override
    public String convertToDatabaseColumn(ApplicationStatus attribute) {
        return attribute == null ? null : attribute.toJson();
    }

    @Override
    public ApplicationStatus convertToEntityAttribute(String dbData) {
        return dbData == null ? null : ApplicationStatus.fromJson(dbData);
    }
}
