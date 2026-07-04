package com.jobtracker.api.applications;

import com.jobtracker.api.applications.dto.ApplicationDetailDto;
import com.jobtracker.api.applications.dto.ApplicationDto;
import com.jobtracker.api.applications.dto.StatusEventDto;
import com.jobtracker.api.notes.ApplicationNote;
import com.jobtracker.api.notes.dto.NoteDto;

import java.util.List;

public final class ApplicationMapper {

    private ApplicationMapper() {
    }

    public static ApplicationDto toDto(JobApplication app) {
        return new ApplicationDto(
                app.getId().toString(),
                app.getSource(),
                app.getSourceUrl(),
                app.getCompanyName(),
                app.getJobTitle(),
                app.getLocationText(),
                app.getSalaryText(),
                app.getAppliedAt(),
                app.getCurrentStatus(),
                app.getCreatedAt(),
                app.getUpdatedAt()
        );
    }

    public static ApplicationDetailDto toDetailDto(JobApplication app, List<ApplicationNote> notes, List<ApplicationStatusEvent> events) {
        return new ApplicationDetailDto(
                app.getId().toString(),
                app.getSource(),
                app.getSourceUrl(),
                app.getCompanyName(),
                app.getJobTitle(),
                app.getLocationText(),
                app.getSalaryText(),
                app.getAppliedAt(),
                app.getCurrentStatus(),
                app.getCreatedAt(),
                app.getUpdatedAt(),
                notes.stream().map(ApplicationMapper::toNoteDto).toList(),
                events.stream().map(ApplicationMapper::toStatusEventDto).toList()
        );
    }

    public static NoteDto toNoteDto(ApplicationNote note) {
        return new NoteDto(note.getId().toString(), note.getContent(), note.getCreatedAt(), note.getUpdatedAt());
    }

    public static StatusEventDto toStatusEventDto(ApplicationStatusEvent event) {
        return new StatusEventDto(event.getId().toString(), event.getStatus(), event.getNote(), event.getChangedAt());
    }
}
