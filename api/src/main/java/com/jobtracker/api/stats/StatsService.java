package com.jobtracker.api.stats;

import com.jobtracker.api.applications.ApplicationStatus;
import com.jobtracker.api.applications.ApplicationStatusEventRepository;
import com.jobtracker.api.applications.JobApplication;
import com.jobtracker.api.applications.JobApplicationRepository;
import com.jobtracker.api.stats.dto.RecentActivityDto;
import com.jobtracker.api.stats.dto.StatsSummaryDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StatsService {

    private static final int RECENT_ACTIVITY_LIMIT = 10;

    private final JobApplicationRepository applicationRepository;
    private final ApplicationStatusEventRepository statusEventRepository;

    @Transactional(readOnly = true)
    public StatsSummaryDto summary(UUID userId) {
        List<JobApplication> applications = applicationRepository.findByUserId(userId);

        Map<ApplicationStatus, Long> counts = applications.stream()
                .collect(Collectors.groupingBy(JobApplication::getCurrentStatus, Collectors.counting()));

        Map<String, Long> byStatus = new LinkedHashMap<>();
        for (ApplicationStatus status : ApplicationStatus.values()) {
            byStatus.put(status.toJson(), counts.getOrDefault(status, 0L));
        }

        List<RecentActivityDto> recentActivity = statusEventRepository
                .findRecentActivityRaw(userId, PageRequest.of(0, RECENT_ACTIVITY_LIMIT))
                .stream()
                .map(this::toRecentActivityDto)
                .toList();

        return new StatsSummaryDto(applications.size(), byStatus, recentActivity);
    }

    private RecentActivityDto toRecentActivityDto(Object[] row) {
        UUID eventId = (UUID) row[0];
        ApplicationStatus status = (ApplicationStatus) row[1];
        String note = (String) row[2];
        Instant changedAt = (Instant) row[3];
        UUID applicationId = (UUID) row[4];
        String companyName = (String) row[5];
        String jobTitle = (String) row[6];

        return new RecentActivityDto(
                eventId.toString(),
                status,
                note,
                changedAt,
                applicationId.toString(),
                companyName,
                jobTitle
        );
    }
}
