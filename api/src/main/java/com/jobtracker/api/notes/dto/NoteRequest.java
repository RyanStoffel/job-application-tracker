package com.jobtracker.api.notes.dto;

import jakarta.validation.constraints.NotBlank;

public record NoteRequest(
        @NotBlank(message = "content must not be blank")
        String content
) {
}
