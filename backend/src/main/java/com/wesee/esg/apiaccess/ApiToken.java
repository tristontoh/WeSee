/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.apiaccess;

import com.wesee.esg.common.StringListConverter;
import com.wesee.esg.common.TenantOwnedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * A long-lived credential letting an external program authenticate to /api/external/v1/** on
 * behalf of a company, restricted to a scope of allowed actions. Distinct from the short-lived
 * per-user session JWTs — see ApiTokenAuthenticationFilter.
 */
@Entity
@Table(name = "api_token")
@Getter
@Setter
@NoArgsConstructor
public class ApiToken extends TenantOwnedEntity {

    @Column(nullable = false, length = 200)
    private String name;

    @Column(name = "token_prefix", nullable = false, length = 16)
    private String tokenPrefix;

    /** SHA-256 hex digest of the full plaintext token — the plaintext itself is never stored. */
    @Column(name = "token_hash", nullable = false, length = 64)
    private String tokenHash;

    @Convert(converter = StringListConverter.class)
    @Column(nullable = false, length = 500)
    private List<String> scopes;

    @Column(name = "created_by_user_id", nullable = false)
    private UUID createdByUserId;

    @Column(name = "last_used_at")
    private Instant lastUsedAt;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;
}
