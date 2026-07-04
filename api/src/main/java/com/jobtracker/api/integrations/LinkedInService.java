package com.jobtracker.api.integrations;

import com.jobtracker.api.applications.ApplicationMapper;
import com.jobtracker.api.applications.ApplicationSource;
import com.jobtracker.api.applications.ApplicationStatus;
import com.jobtracker.api.applications.ApplicationStatusEvent;
import com.jobtracker.api.applications.ApplicationStatusEventRepository;
import com.jobtracker.api.applications.JobApplication;
import com.jobtracker.api.applications.JobApplicationRepository;
import com.jobtracker.api.applications.dto.ApplicationDto;
import com.jobtracker.api.common.util.DateParsing;
import com.jobtracker.api.common.util.UrlCanonicalizer;
import com.jobtracker.api.integrations.dto.LinkedInIngestRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LinkedInService {

    private final JobApplicationRepository applicationRepository;
    private final ApplicationStatusEventRepository statusEventRepository;

    /**
     * Ingests a LinkedIn listing capture. Dedupes on (user_id, canonical
     * source_url); returns the existing record unchanged (created=false) if
     * one already exists, otherwise creates a new "applied" record
     * (created=true) per docs/AGENTS.md's extension defaults.
     */
    @Transactional
    public IngestResult ingest(UUID userId, LinkedInIngestRequest req) {
        String canonicalUrl = UrlCanonicalizer.canonicalize(req.sourceUrl());

        var existing = applicationRepository.findByUserIdAndSourceUrl(userId, canonicalUrl);
        if (existing.isPresent()) {
            return new IngestResult(ApplicationMapper.toDto(existing.get()), false);
        }

        try {
            return new IngestResult(createNew(userId, req, canonicalUrl), true);
        } catch (DataIntegrityViolationException raceLost) {
            // Another concurrent request created it first; fall back to the existing row.
            JobApplication app = applicationRepository.findByUserIdAndSourceUrl(userId, canonicalUrl)
                    .orElseThrow(() -> raceLost);
            return new IngestResult(ApplicationMapper.toDto(app), false);
        }
    }

    private ApplicationDto createNew(UUID userId, LinkedInIngestRequest req, String canonicalUrl) {
        JobApplication app = new JobApplication();
        app.setUserId(userId);
        app.setSource(ApplicationSource.LINKEDIN);
        app.setSourceUrl(canonicalUrl);
        app.setCompanyName(req.companyName());
        app.setJobTitle(req.jobTitle());
        app.setLocationText(req.locationText());
        app.setSalaryText(req.salaryText());
        app.setAppliedAt(DateParsing.parseFlexibleInstant(req.postedAt(), "postedAt"));
        app.setCurrentStatus(ApplicationStatus.APPLIED);

        JobApplication saved = applicationRepository.save(app);
        statusEventRepository.save(ApplicationStatusEvent.builder()
                .applicationId(saved.getId())
                .status(ApplicationStatus.APPLIED)
                .note(null)
                .changedAt(Instant.now())
                .build());

        return ApplicationMapper.toDto(saved);
    }

    public record IngestResult(ApplicationDto application, boolean created) {
    }
}
