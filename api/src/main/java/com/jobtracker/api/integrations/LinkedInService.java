package com.jobtracker.api.integrations;

import com.jobtracker.api.applications.ApplicationSource;
import com.jobtracker.api.integrations.dto.CaptureIngestRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LinkedInService {

    private final IngestionService ingestionService;

    public IngestionService.IngestResult ingest(UUID userId, CaptureIngestRequest req) {
        return ingestionService.ingest(userId, ApplicationSource.LINKEDIN, req);
    }
}
