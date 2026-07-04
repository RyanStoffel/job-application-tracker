package com.jobtracker.api.applications;

import com.jobtracker.api.applications.dto.ApplicationDetailDto;
import com.jobtracker.api.applications.dto.ApplicationDto;
import com.jobtracker.api.applications.dto.CreateApplicationRequest;
import com.jobtracker.api.applications.dto.StatusUpdateRequest;
import com.jobtracker.api.applications.dto.UpdateApplicationRequest;
import com.jobtracker.api.common.exception.BadRequestException;
import com.jobtracker.api.common.exception.NotFoundException;
import com.jobtracker.api.common.util.DateParsing;
import com.jobtracker.api.notes.ApplicationNote;
import com.jobtracker.api.notes.ApplicationNoteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

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
        app.setAppliedAt(DateParsing.parseFlexibleInstant(req.appliedAt(), "appliedAt"));
        app.setCurrentStatus(req.currentStatus());

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

        if (req.companyName() != null) {
            app.setCompanyName(req.companyName());
        }
        if (req.jobTitle() != null) {
            app.setJobTitle(req.jobTitle());
        }
        if (req.sourceUrl() != null) {
            app.setSourceUrl(req.sourceUrl());
        }
        if (req.locationText() != null) {
            app.setLocationText(req.locationText());
        }
        if (req.salaryText() != null) {
            app.setSalaryText(req.salaryText());
        }
        if (req.appliedAt() != null) {
            app.setAppliedAt(DateParsing.parseFlexibleInstant(req.appliedAt(), "appliedAt"));
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
        JobApplication saved = applicationRepository.save(app);
        recordStatusEvent(saved.getId(), req.status(), req.note());
        return toDetail(saved);
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
