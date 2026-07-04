package com.jobtracker.api.applications;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/** Persists {@link ApplicationSource} as the lowercase strings used by the DB CHECK constraints. */
@Converter(autoApply = true)
public class ApplicationSourceConverter implements AttributeConverter<ApplicationSource, String> {

    @Override
    public String convertToDatabaseColumn(ApplicationSource attribute) {
        return attribute == null ? null : attribute.toJson();
    }

    @Override
    public ApplicationSource convertToEntityAttribute(String dbData) {
        return dbData == null ? null : ApplicationSource.fromJson(dbData);
    }
}
