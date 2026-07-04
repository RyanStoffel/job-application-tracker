package com.jobtracker.api.applications;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface JobApplicationRepository extends JpaRepository<JobApplication, UUID>, JpaSpecificationExecutor<JobApplication> {

    Optional<JobApplication> findByUserIdAndSourceUrl(UUID userId, String sourceUrl);

    List<JobApplication> findByUserId(UUID userId);
}
