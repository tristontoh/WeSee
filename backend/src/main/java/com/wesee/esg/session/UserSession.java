package com.wesee.esg.session;

import com.wesee.esg.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * One row per issued session JWT, keyed by the token's jti claim. Independent of AppUser.tokenVersion
 * (the all-tokens kill-switch used by password change) — this table is the granular per-device lever
 * behind "view active sessions" / "revoke this device" / "log out other devices".
 */
@Entity
@Table(name = "user_session")
@Getter
@Setter
@NoArgsConstructor
public class UserSession extends BaseEntity {

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false, unique = true, length = 36)
    private String jti;

    @Column(name = "ip_address", length = 64)
    private String ipAddress;

    @Column(name = "user_agent", length = 500)
    private String userAgent;

    @Column(name = "last_seen_at", nullable = false)
    private Instant lastSeenAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;
}
