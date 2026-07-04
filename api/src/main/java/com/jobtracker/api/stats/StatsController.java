package com.jobtracker.api.stats;

import com.jobtracker.api.stats.dto.StatsSummaryDto;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/stats")
@RequiredArgsConstructor
public class StatsController {

    private final StatsService statsService;

    @GetMapping("/summary")
    public StatsSummaryDto summary(@AuthenticationPrincipal UUID userId) {
        return statsService.summary(userId);
    }
}
