package com.jobtracker.api.notes;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ApplicationNoteRepository extends JpaRepository<ApplicationNote, UUID> {

    List<ApplicationNote> findByApplicationIdOrderByCreatedAtDesc(UUID applicationId);
}
