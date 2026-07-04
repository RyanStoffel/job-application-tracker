package com.jobtracker.api.applications;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

/**
 * Flags likely duplicate/repost applications by a case-insensitive/trimmed
 * company+title match. Never blocks a create/update - it only surfaces a
 * pointer to the most recent match (see docs/AGENTS.md: "ambiguous matches
 * should surface for review, not mutate records silently").
 */
@Component
@RequiredArgsConstructor
public class DuplicateDetector {

    private final JobApplicationRepository applicationRepository;

    /**
     * @param excludeId the record being created/updated, if any, so it never
     *                  flags itself as its own duplicate
     */
    public UUID findDuplicateOf(UUID userId, String companyName, String jobTitle, UUID excludeId) {
        List<JobApplication> matches =
                applicationRepository.findPossibleDuplicates(userId, companyName, jobTitle, excludeId);
        return matches.isEmpty() ? null : matches.get(0).getId();
    }
}
