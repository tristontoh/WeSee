package com.wesee.esg.tenant;

import com.wesee.esg.common.TenantOwnedEntity;
import com.wesee.esg.user.Role;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "team_invite")
@Getter
@Setter
@NoArgsConstructor
public class TeamInvite extends TenantOwnedEntity {

    @Column(nullable = false, length = 255)
    private String email;

    @Column(nullable = false, length = 200)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Role role;

    @Column(nullable = false, unique = true, length = 64)
    private String token;

    @Column(name = "invited_by_name", length = 200)
    private String invitedByName;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "accepted_at")
    private Instant acceptedAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;
}
