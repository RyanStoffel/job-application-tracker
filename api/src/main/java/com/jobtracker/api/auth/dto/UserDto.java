package com.jobtracker.api.auth.dto;

import java.time.Instant;

public record UserDto(
        String id,
        String email,
        String displayName,
        String avatarUrl,
        Instant createdAt
) {
}
