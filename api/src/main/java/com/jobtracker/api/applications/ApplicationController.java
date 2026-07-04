package com.jobtracker.api.applications;

import com.jobtracker.api.applications.dto.ApplicationDetailDto;
import com.jobtracker.api.applications.dto.ApplicationDto;
import com.jobtracker.api.applications.dto.CreateApplicationRequest;
import com.jobtracker.api.applications.dto.StatusUpdateRequest;
import com.jobtracker.api.applications.dto.UpdateApplicationRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/applications")
@RequiredArgsConstructor
public class ApplicationController {

    private final ApplicationService applicationService;

    @GetMapping
    public List<ApplicationDto> list(@AuthenticationPrincipal UUID userId,
                                      @RequestParam(required = false) String status,
                                      @RequestParam(required = false) String q,
                                      @RequestParam(required = false) String sort) {
        return applicationService.list(userId, status, q, sort);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApplicationDto create(@AuthenticationPrincipal UUID userId, @Valid @RequestBody CreateApplicationRequest req) {
        return applicationService.create(userId, req);
    }

    @GetMapping("/{id}")
    public ApplicationDetailDto get(@AuthenticationPrincipal UUID userId, @PathVariable UUID id) {
        return applicationService.getDetail(userId, id);
    }

    @PatchMapping("/{id}")
    public ApplicationDto update(@AuthenticationPrincipal UUID userId, @PathVariable UUID id,
                                  @Valid @RequestBody UpdateApplicationRequest req) {
        return applicationService.update(userId, id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal UUID userId, @PathVariable UUID id) {
        applicationService.delete(userId, id);
    }

    @PostMapping("/{id}/status")
    public ApplicationDetailDto changeStatus(@AuthenticationPrincipal UUID userId, @PathVariable UUID id,
                                              @Valid @RequestBody StatusUpdateRequest req) {
        return applicationService.changeStatus(userId, id, req);
    }
}
