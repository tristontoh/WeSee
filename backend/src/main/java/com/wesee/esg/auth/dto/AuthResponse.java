package com.wesee.esg.auth.dto;

public record AuthResponse(
        String token,
        MeResponse user
) {
}
