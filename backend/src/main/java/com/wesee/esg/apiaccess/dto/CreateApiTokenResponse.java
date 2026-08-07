package com.wesee.esg.apiaccess.dto;

import com.wesee.esg.apiaccess.ApiToken;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Identical to ApiTokenResponse plus the plaintext token — returned only once, at creation time. */
public record CreateApiTokenResponse(
        UUID id,
        String name,
        String tokenPrefix,
        List<String> scopes,
        Instant createdAt,
        Instant lastUsedAt,
        Instant expiresAt,
        boolean revoked,
        String token
) {
    public static CreateApiTokenResponse from(ApiToken t, String plaintextToken) {
        return new CreateApiTokenResponse(t.getId(), t.getName(), t.getTokenPrefix(), t.getScopes(),
                t.getCreatedAt(), t.getLastUsedAt(), t.getExpiresAt(), t.getRevokedAt() != null, plaintextToken);
    }
}
