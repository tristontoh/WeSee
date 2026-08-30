/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.apiaccess.dto;

import com.wesee.esg.apiaccess.ApiToken;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ApiTokenResponse(
        UUID id,
        String name,
        String tokenPrefix,
        List<String> scopes,
        Instant createdAt,
        Instant lastUsedAt,
        Instant expiresAt,
        boolean revoked
) {
    public static ApiTokenResponse from(ApiToken t) {
        return new ApiTokenResponse(t.getId(), t.getName(), t.getTokenPrefix(), t.getScopes(),
                t.getCreatedAt(), t.getLastUsedAt(), t.getExpiresAt(), t.getRevokedAt() != null);
    }
}
