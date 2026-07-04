package com.jobtracker.api.notes;

import com.jobtracker.api.notes.dto.NoteDto;
import com.jobtracker.api.notes.dto.NoteRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/applications/{applicationId}/notes")
@RequiredArgsConstructor
public class NoteController {

    private final NoteService noteService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public NoteDto create(@AuthenticationPrincipal UUID userId, @PathVariable UUID applicationId,
                           @Valid @RequestBody NoteRequest req) {
        return noteService.create(userId, applicationId, req);
    }

    @PatchMapping("/{noteId}")
    public NoteDto update(@AuthenticationPrincipal UUID userId, @PathVariable UUID applicationId,
                           @PathVariable UUID noteId, @Valid @RequestBody NoteRequest req) {
        return noteService.update(userId, applicationId, noteId, req);
    }

    @DeleteMapping("/{noteId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal UUID userId, @PathVariable UUID applicationId,
                        @PathVariable UUID noteId) {
        noteService.delete(userId, applicationId, noteId);
    }
}
