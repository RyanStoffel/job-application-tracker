package com.jobtracker.api.integrations;

import com.jobtracker.api.applications.ApplicationMapper;
import com.jobtracker.api.applications.ApplicationSource;
import com.jobtracker.api.applications.ApplicationStatus;
import com.jobtracker.api.applications.ApplicationStatusEvent;
import com.jobtracker.api.applications.ApplicationStatusEventRepository;
import com.jobtracker.api.applications.DuplicateDetector;
import com.jobtracker.api.applications.JobApplication;
import com.jobtracker.api.applications.JobApplicationRepository;
import com.jobtracker.api.applications.dto.ApplicationDto;
import com.jobtracker.api.common.util.DateParsing;
import com.jobtracker.api.common.util.LocationParser;
import com.jobtracker.api.common.util.SalaryParser;
import com.jobtracker.api.common.util.UrlCanonicalizer;
import com.jobtracker.api.integrations.dto.CaptureIngestRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.UUID;

/**
 * Shared capture/ingest logic behind both POST /api/integrations/linkedin
 * and POST /api/integrations/capture (see {@code LinkedInService} and
 * {@code GenericCaptureService}). Kept in one place so URL canonicalization,
 * dedupe, duplicate/repost detection, and structured-field derivation don't
 * drift between capture sources.
 */
@Service
@RequiredArgsConstructor
public class IngestionService {

    private final JobApplicationRepository applicationRepository;
    private final ApplicationStatusEventRepository statusEventRepository;
    private final DuplicateDetector duplicateDetector;

    /**
     * Ingests a capture. Dedupes on (user_id, canonical source_url); returns
     * the existing record unchanged (created=false) if one already exists,
     * otherwise creates a new "applied" record (created=true) per
     * docs/AGENTS.md's extension defaults.
     */
    @Transactional
    public IngestResult ingest(UUID userId, ApplicationSource source, CaptureIngestRequest req) {
        String canonicalUrl = UrlCanonicalizer.canonicalize(req.sourceUrl());

        var existing = applicationRepository.findByUserIdAndSourceUrl(userId, canonicalUrl);
        if (existing.isPresent()) {
            return new IngestResult(ApplicationMapper.toDto(existing.get()), false);
        }

        try {
            return new IngestResult(createNew(userId, source, req, canonicalUrl), true);
        } catch (DataIntegrityViolationException raceLost) {
            // Another concurrent request created it first; fall back to the existing row.
            JobApplication app = applicationRepository.findByUserIdAndSourceUrl(userId, canonicalUrl)
                    .orElseThrow(() -> raceLost);
            return new IngestResult(ApplicationMapper.toDto(app), false);
        }
    }

    private ApplicationDto createNew(UUID userId, ApplicationSource source, CaptureIngestRequest req, String canonicalUrl) {
        JobApplication app = new JobApplication();
        app.setUserId(userId);
        app.setSource(source);
        app.setSourceUrl(canonicalUrl);
        app.setCompanyName(req.companyName());
        app.setJobTitle(req.jobTitle());
        app.setLocationText(req.locationText());
        app.setSalaryText(req.salaryText());
        app.setCompanyLogoUrl(req.companyLogoUrl());
        app.setPostedAt(DateParsing.parseFlexibleInstant(req.postedAt(), "postedAt"));

        Instant appliedAt = StringUtils.hasText(req.appliedAt())
                ? DateParsing.parseFlexibleInstant(req.appliedAt(), "appliedAt")
                : Instant.now();
        app.setAppliedAt(appliedAt);
        app.setCurrentStatus(ApplicationStatus.APPLIED);

        applyStructuredLocation(app, req);
        applyStructuredSalary(app, req);

        UUID duplicateOfId = duplicateDetector.findDuplicateOf(userId, req.companyName(), req.jobTitle(), null);
        app.setDuplicateOfId(duplicateOfId);

        JobApplication saved = applicationRepository.save(app);
        statusEventRepository.save(ApplicationStatusEvent.builder()
                .applicationId(saved.getId())
                .status(ApplicationStatus.APPLIED)
                .note(null)
                .changedAt(Instant.now())
                .build());

        return ApplicationMapper.toDto(saved);
    }

    private void applyStructuredLocation(JobApplication app, CaptureIngestRequest req) {
        boolean hasOverride = req.locationCity() != null || req.locationRegion() != null
                || req.locationCountry() != null || req.isRemote() != null;
        if (hasOverride) {
            app.setLocationCity(req.locationCity());
            app.setLocationRegion(req.locationRegion());
            app.setLocationCountry(req.locationCountry());
            app.setIsRemote(req.isRemote());
            return;
        }
        LocationParser.Result parsed = LocationParser.parse(req.locationText());
        app.setLocationCity(parsed.city());
        app.setLocationRegion(parsed.region());
        app.setLocationCountry(parsed.country());
        app.setIsRemote(parsed.isRemote());
    }

    private void applyStructuredSalary(JobApplication app, CaptureIngestRequest req) {
        boolean hasOverride = req.salaryMin() != null || req.salaryMax() != null
                || req.salaryCurrency() != null || req.salaryPeriod() != null;
        if (hasOverride) {
            app.setSalaryMin(req.salaryMin());
            app.setSalaryMax(req.salaryMax());
            app.setSalaryCurrency(req.salaryCurrency());
            app.setSalaryPeriod(req.salaryPeriod());
            return;
        }
        SalaryParser.Result parsed = SalaryParser.parse(req.salaryText());
        app.setSalaryMin(parsed.min());
        app.setSalaryMax(parsed.max());
        app.setSalaryCurrency(parsed.currency());
        app.setSalaryPeriod(parsed.period());
    }

    public record IngestResult(ApplicationDto application, boolean created) {
    }
}
