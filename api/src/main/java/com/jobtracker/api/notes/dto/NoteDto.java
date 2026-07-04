package com.jobtracker.api.notes.dto;

import java.time.Instant;

public record NoteDto(
        String id,
        String content,
        Instant createdAt,
        Instant updatedAt
) {
}
