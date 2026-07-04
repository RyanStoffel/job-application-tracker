package com.jobtracker.api.applications.dto;

import com.jobtracker.api.applications.ApplicationSource;
import com.jobtracker.api.applications.ApplicationStatus;
import com.jobtracker.api.notes.dto.NoteDto;

import java.time.Instant;
import java.util.List;

/** {@code Application & { notes: Note[], statusHistory: StatusEvent[] }} per the API contract. */
public record ApplicationDetailDto(
        String id,
        ApplicationSource source,
        String sourceUrl,
        String companyName,
        String jobTitle,
        String locationText,
        String salaryText,
        Instant appliedAt,
        ApplicationStatus currentStatus,
        Instant createdAt,
        Instant updatedAt,
        List<NoteDto> notes,
        List<StatusEventDto> statusHistory
) {
}
