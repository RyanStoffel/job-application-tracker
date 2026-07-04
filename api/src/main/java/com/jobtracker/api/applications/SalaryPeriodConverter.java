package com.jobtracker.api.applications;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/** Persists {@link SalaryPeriod} as the lowercase strings used by the DB CHECK constraint. */
@Converter(autoApply = true)
public class SalaryPeriodConverter implements AttributeConverter<SalaryPeriod, String> {

    @Override
    public String convertToDatabaseColumn(SalaryPeriod attribute) {
        return attribute == null ? null : attribute.toJson();
    }

    @Override
    public SalaryPeriod convertToEntityAttribute(String dbData) {
        return dbData == null ? null : SalaryPeriod.fromJson(dbData);
    }
}
