package com.jobtracker.api.notes;

import com.jobtracker.api.applications.ApplicationMapper;
import com.jobtracker.api.applications.JobApplicationRepository;
import com.jobtracker.api.common.exception.NotFoundException;
import com.jobtracker.api.notes.dto.NoteDto;
import com.jobtracker.api.notes.dto.NoteRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NoteService {

    private final JobApplicationRepository applicationRepository;
    private final ApplicationNoteRepository noteRepository;

    @Transactional
    public NoteDto create(UUID userId, UUID applicationId, NoteRequest req) {
        assertApplicationOwned(userId, applicationId);

        ApplicationNote note = new ApplicationNote();
        note.setApplicationId(applicationId);
        note.setContent(req.content());
        ApplicationNote saved = noteRepository.save(note);
        return ApplicationMapper.toNoteDto(saved);
    }

    @Transactional
    public NoteDto update(UUID userId, UUID applicationId, UUID noteId, NoteRequest req) {
        assertApplicationOwned(userId, applicationId);
        ApplicationNote note = findOwnedNote(applicationId, noteId);
        note.setContent(req.content());
        return ApplicationMapper.toNoteDto(noteRepository.save(note));
    }

    @Transactional
    public void delete(UUID userId, UUID applicationId, UUID noteId) {
        assertApplicationOwned(userId, applicationId);
        ApplicationNote note = findOwnedNote(applicationId, noteId);
        noteRepository.delete(note);
    }

    private void assertApplicationOwned(UUID userId, UUID applicationId) {
        var app = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new NotFoundException("Application not found"));
        if (!app.getUserId().equals(userId)) {
            throw new NotFoundException("Application not found");
        }
    }

    private ApplicationNote findOwnedNote(UUID applicationId, UUID noteId) {
        ApplicationNote note = noteRepository.findById(noteId)
                .orElseThrow(() -> new NotFoundException("Note not found"));
        if (!note.getApplicationId().equals(applicationId)) {
            throw new NotFoundException("Note not found");
        }
        return note;
    }
}
