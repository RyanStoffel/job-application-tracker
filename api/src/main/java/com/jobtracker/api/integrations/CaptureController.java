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

/**
 * Generic (non-LinkedIn) fallback capture endpoint used by the extension's
 * generic content-script parser for unsupported/unrecognized job sites - see
 * docs/ARCHITECTURE.md "Generic capture flow". Same request/response shape
 * as POST /api/integrations/linkedin; creates records as source=other.
 */
@RestController
@RequestMapping("/api/integrations/capture")
@RequiredArgsConstructor
public class CaptureController {

    private final GenericCaptureService genericCaptureService;

    @PostMapping
    public ResponseEntity<ApplicationDto> ingest(@AuthenticationPrincipal UUID userId,
                                                  @Valid @RequestBody CaptureIngestRequest req) {
        IngestionService.IngestResult result = genericCaptureService.ingest(userId, req);
        HttpStatus status = result.created() ? HttpStatus.CREATED : HttpStatus.OK;
        return ResponseEntity.status(status).body(result.application());
    }
}
