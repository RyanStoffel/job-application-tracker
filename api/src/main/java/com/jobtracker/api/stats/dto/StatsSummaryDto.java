package com.jobtracker.api.stats.dto;

import java.util.List;
import java.util.Map;

public record StatsSummaryDto(
        long total,
        Map<String, Long> byStatus,
        List<RecentActivityDto> recentActivity
) {
}
