package com.jobtracker.api.applications;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface JobApplicationRepository extends JpaRepository<JobApplication, UUID>, JpaSpecificationExecutor<JobApplication> {

    Optional<JobApplication> findByUserIdAndSourceUrl(UUID userId, String sourceUrl);

    List<JobApplication> findByUserId(UUID userId);

    /**
     * Case-insensitive/trimmed company+title match for the same user, used
     * for duplicate/repost detection (see {@link DuplicateDetector}).
     * {@code excludeId} is nullable so the same query works for both
     * create (no id yet) and update (exclude self) callers.
     */
    @Query("SELECT a FROM JobApplication a "
            + "WHERE a.userId = :userId "
            + "AND LOWER(TRIM(a.companyName)) = LOWER(TRIM(:companyName)) "
            + "AND LOWER(TRIM(a.jobTitle)) = LOWER(TRIM(:jobTitle)) "
            + "AND (:excludeId IS NULL OR a.id <> :excludeId) "
            + "ORDER BY a.createdAt DESC")
    List<JobApplication> findPossibleDuplicates(
            @Param("userId") UUID userId,
            @Param("companyName") String companyName,
            @Param("jobTitle") String jobTitle,
            @Param("excludeId") UUID excludeId
    );
}
