package com.jobtracker.api.auth.dto;

public record AuthResponse(UserDto user, String token) {
}
