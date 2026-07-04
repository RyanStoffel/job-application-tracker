package com.jobtracker.api.integrations;

import com.jobtracker.api.applications.dto.ApplicationDto;
import com.jobtracker.api.integrations.dto.CaptureIngestRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/integrations/linkedin")
@RequiredArgsConstructor
public class LinkedInController {

    private final LinkedInService linkedInService;

    @PostMapping
    public ResponseEntity<ApplicationDto> ingest(@AuthenticationPrincipal UUID userId,
                                                  @Valid @RequestBody CaptureIngestRequest req) {
        IngestionService.IngestResult result = linkedInService.ingest(userId, req);
        HttpStatus status = result.created() ? HttpStatus.CREATED : HttpStatus.OK;
        return ResponseEntity.status(status).body(result.application());
    }
}
