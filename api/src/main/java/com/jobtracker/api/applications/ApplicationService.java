package com.jobtracker.api.applications;

import com.jobtracker.api.applications.dto.ApplicationDetailDto;
import com.jobtracker.api.applications.dto.ApplicationDto;
import com.jobtracker.api.applications.dto.CreateApplicationRequest;
import com.jobtracker.api.applications.dto.StatusUpdateRequest;
import com.jobtracker.api.applications.dto.UpdateApplicationRequest;
import com.jobtracker.api.common.exception.BadRequestException;
import com.jobtracker.api.common.exception.NotFoundException;
import com.jobtracker.api.common.util.DateParsing;
import com.jobtracker.api.common.util.LocationParser;
import com.jobtracker.api.common.util.SalaryParser;
import com.jobtracker.api.notes.ApplicationNote;
import com.jobtracker.api.notes.ApplicationNoteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ApplicationService {

    private final JobApplicationRepository applicationRepository;
    private final ApplicationStatusEventRepository statusEventRepository;
    private final ApplicationNoteRepository noteRepository;
    private final DuplicateDetector duplicateDetector;

    @Transactional(readOnly = true)
    public List<ApplicationDto> list(UUID userId, String status, String q, String sort) {
        Specification<JobApplication> spec = (root, query, cb) -> cb.equal(root.get("userId"), userId);

        if (StringUtils.hasText(status)) {
            ApplicationStatus parsedStatus = parseStatus(status);
            spec = spec.and((root, query, cb) -> cb.equal(root.get("currentStatus"), parsedStatus));
        }

        if (StringUtils.hasText(q)) {
            String like = "%" + q.trim().toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("companyName")), like),
                    cb.like(cb.lower(root.get("jobTitle")), like)
            ));
        }

        Sort resolvedSort = resolveSort(sort);
        return applicationRepository.findAll(spec, resolvedSort).stream().map(ApplicationMapper::toDto).toList();
    }

    @Transactional
    public ApplicationDto create(UUID userId, CreateApplicationRequest req) {
        JobApplication app = new JobApplication();
        app.setUserId(userId);
        app.setSource(ApplicationSource.MANUAL);
        app.setSourceUrl(StringUtils.hasText(req.sourceUrl()) ? req.sourceUrl() : null);
        app.setCompanyName(req.companyName());
        app.setJobTitle(req.jobTitle());
        app.setLocationText(req.locationText());
        app.setSalaryText(req.salaryText());
        app.setCompanyLogoUrl(req.companyLogoUrl());
        app.setPostedAt(DateParsing.parseFlexibleInstant(req.postedAt(), "postedAt"));
        app.setCurrentStatus(req.currentStatus());

        // Auto-fill appliedAt: a "saved" application hasn't been applied to
        // yet, so leave it null unless the caller explicitly supplied one;
        // any other starting status implies the user has already applied.
        if (StringUtils.hasText(req.appliedAt())) {
            app.setAppliedAt(DateParsing.parseFlexibleInstant(req.appliedAt(), "appliedAt"));
        } else if (req.currentStatus() != ApplicationStatus.SAVED) {
            app.setAppliedAt(Instant.now());
        }

        applyStructuredLocation(app, req.locationText(), req.locationCity(), req.locationRegion(), req.locationCountry(), req.isRemote());
        applyStructuredSalary(app, req.salaryText(), req.salaryMin(), req.salaryMax(), req.salaryCurrency(), req.salaryPeriod());

        UUID duplicateOfId = duplicateDetector.findDuplicateOf(userId, req.companyName(), req.jobTitle(), null);
        app.setDuplicateOfId(duplicateOfId);

        JobApplication saved = applicationRepository.save(app);
        recordStatusEvent(saved.getId(), saved.getCurrentStatus(), null);

        return ApplicationMapper.toDto(saved);
    }

    @Transactional(readOnly = true)
    public ApplicationDetailDto getDetail(UUID userId, UUID id) {
        JobApplication app = findOwned(userId, id);
        return toDetail(app);
    }

    @Transactional
    public ApplicationDto update(UUID userId, UUID id, UpdateApplicationRequest req) {
        JobApplication app = findOwned(userId, id);

        boolean identityChanged = req.companyName() != null || req.jobTitle() != null;
        if (req.companyName() != null) {
            app.setCompanyName(req.companyName());
        }
        if (req.jobTitle() != null) {
            app.setJobTitle(req.jobTitle());
        }
        if (identityChanged) {
            // Company/title just changed - re-run duplicate detection so
            // duplicateOfId doesn't go stale (e.g. a typo fix could newly
            // collide with, or no longer collide with, another record).
            UUID duplicateOfId = duplicateDetector.findDuplicateOf(userId, app.getCompanyName(), app.getJobTitle(), id);
            app.setDuplicateOfId(duplicateOfId);
        }
        if (req.sourceUrl() != null) {
            app.setSourceUrl(req.sourceUrl());
        }
        if (req.appliedAt() != null) {
            app.setAppliedAt(DateParsing.parseFlexibleInstant(req.appliedAt(), "appliedAt"));
        }
        if (req.postedAt() != null) {
            app.setPostedAt(DateParsing.parseFlexibleInstant(req.postedAt(), "postedAt"));
        }
        if (req.companyLogoUrl() != null) {
            app.setCompanyLogoUrl(req.companyLogoUrl());
        }

        boolean locationChanged = req.locationText() != null;
        if (locationChanged) {
            app.setLocationText(req.locationText());
        }
        boolean hasLocationOverride = req.locationCity() != null || req.locationRegion() != null
                || req.locationCountry() != null || req.isRemote() != null;
        if (hasLocationOverride) {
            applyStructuredLocation(app, app.getLocationText(), req.locationCity(), req.locationRegion(), req.locationCountry(), req.isRemote());
        } else if (locationChanged) {
            // Raw text changed with no explicit structured override - re-derive so the
            // structured fields don't go stale relative to what's now displayed.
            applyStructuredLocation(app, app.getLocationText(), null, null, null, null);
        }

        boolean salaryChanged = req.salaryText() != null;
        if (salaryChanged) {
            app.setSalaryText(req.salaryText());
        }
        boolean hasSalaryOverride = req.salaryMin() != null || req.salaryMax() != null
                || req.salaryCurrency() != null || req.salaryPeriod() != null;
        if (hasSalaryOverride) {
            applyStructuredSalary(app, app.getSalaryText(), req.salaryMin(), req.salaryMax(), req.salaryCurrency(), req.salaryPeriod());
        } else if (salaryChanged) {
            applyStructuredSalary(app, app.getSalaryText(), null, null, null, null);
        }

        JobApplication saved = applicationRepository.save(app);
        return ApplicationMapper.toDto(saved);
    }

    @Transactional
    public void delete(UUID userId, UUID id) {
        JobApplication app = findOwned(userId, id);
        applicationRepository.delete(app);
    }

    @Transactional
    public ApplicationDetailDto changeStatus(UUID userId, UUID id, StatusUpdateRequest req) {
        JobApplication app = findOwned(userId, id);
        app.setCurrentStatus(req.status());
        // Reduce manual data entry for the common save -> applied transition:
        // if the user never recorded when they applied, the moment they mark
        // it "applied" is the best available signal.
        if (req.status() == ApplicationStatus.APPLIED && app.getAppliedAt() == null) {
            app.setAppliedAt(Instant.now());
        }
        JobApplication saved = applicationRepository.save(app);
        recordStatusEvent(saved.getId(), req.status(), req.note());
        return toDetail(saved);
    }

    private void applyStructuredLocation(JobApplication app, String locationText, String city, String region, String country, Boolean isRemote) {
        boolean hasOverride = city != null || region != null || country != null || isRemote != null;
        if (hasOverride) {
            app.setLocationCity(city);
            app.setLocationRegion(region);
            app.setLocationCountry(country);
            app.setIsRemote(isRemote);
            return;
        }
        LocationParser.Result parsed = LocationParser.parse(locationText);
        app.setLocationCity(parsed.city());
        app.setLocationRegion(parsed.region());
        app.setLocationCountry(parsed.country());
        app.setIsRemote(parsed.isRemote());
    }

    private void applyStructuredSalary(JobApplication app, String salaryText, BigDecimal min, BigDecimal max, String currency, SalaryPeriod period) {
        boolean hasOverride = min != null || max != null || currency != null || period != null;
        if (hasOverride) {
            app.setSalaryMin(min);
            app.setSalaryMax(max);
            app.setSalaryCurrency(currency);
            app.setSalaryPeriod(period);
            return;
        }
        SalaryParser.Result parsed = SalaryParser.parse(salaryText);
        app.setSalaryMin(parsed.min());
        app.setSalaryMax(parsed.max());
        app.setSalaryCurrency(parsed.currency());
        app.setSalaryPeriod(parsed.period());
    }

    private void recordStatusEvent(UUID applicationId, ApplicationStatus status, String note) {
        statusEventRepository.save(ApplicationStatusEvent.builder()
                .applicationId(applicationId)
                .status(status)
                .note(note)
                .changedAt(Instant.now())
                .build());
    }

    private ApplicationDetailDto toDetail(JobApplication app) {
        List<ApplicationNote> notes = noteRepository.findByApplicationIdOrderByCreatedAtDesc(app.getId());
        List<ApplicationStatusEvent> events = statusEventRepository.findByApplicationIdOrderByChangedAtDesc(app.getId());
        return ApplicationMapper.toDetailDto(app, notes, events);
    }

    JobApplication findOwned(UUID userId, UUID id) {
        JobApplication app = applicationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Application not found"));
        if (!app.getUserId().equals(userId)) {
            throw new NotFoundException("Application not found");
        }
        return app;
    }

    private ApplicationStatus parseStatus(String status) {
        try {
            return ApplicationStatus.fromJson(status);
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid status value", Map.of("status", "must be one of the known statuses"));
        }
    }

    private Sort resolveSort(String sort) {
        if (sort == null) {
            return Sort.by(Sort.Direction.DESC, "createdAt");
        }
        return switch (sort) {
            case "createdAt" -> Sort.by(Sort.Direction.ASC, "createdAt");
            case "-createdAt" -> Sort.by(Sort.Direction.DESC, "createdAt");
            case "companyName" -> Sort.by(Sort.Direction.ASC, "companyName");
            case "-companyName" -> Sort.by(Sort.Direction.DESC, "companyName");
            case "currentStatus" -> Sort.by(Sort.Direction.ASC, "currentStatus");
            default -> Sort.by(Sort.Direction.DESC, "createdAt");
        };
    }
}
