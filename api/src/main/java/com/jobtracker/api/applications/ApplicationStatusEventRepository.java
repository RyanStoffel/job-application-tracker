package com.jobtracker.api.applications;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface ApplicationStatusEventRepository extends JpaRepository<ApplicationStatusEvent, UUID> {

    List<ApplicationStatusEvent> findByApplicationIdOrderByChangedAtDesc(UUID applicationId);

    /**
     * Raw projection (rather than a JPQL constructor expression) for the
     * recent-activity feed, joining across the (unrelated, plain-FK)
     * job_applications table. Columns, in order:
     * event.id, event.status, event.note, event.changedAt,
     * application.id, application.companyName, application.jobTitle.
     */
    @Query("""
            SELECT e.id, e.status, e.note, e.changedAt, a.id, a.companyName, a.jobTitle
            FROM ApplicationStatusEvent e JOIN JobApplication a ON a.id = e.applicationId
            WHERE a.userId = :userId
            ORDER BY e.changedAt DESC
            """)
    List<Object[]> findRecentActivityRaw(@Param("userId") UUID userId, Pageable pageable);
}
