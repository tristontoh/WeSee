/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.tenant.dto;

import com.wesee.esg.tenant.TeamInvite;
import com.wesee.esg.user.Role;

import java.time.Instant;
import java.util.UUID;

public record TeamInviteResponse(
        UUID id,
        String name,
        String email,
        Role role,
        UUID customRoleId,
        String customRoleName,
        String invitedByName,
        Instant createdAt,
        Instant expiresAt,
        boolean expired,
        String inviteUrl
) {
    public static TeamInviteResponse from(TeamInvite invite, String inviteUrl) {
        return new TeamInviteResponse(
                invite.getId(), invite.getName(), invite.getEmail(), invite.getRole(),
                invite.getCustomRole() != null ? invite.getCustomRole().getId() : null,
                invite.getCustomRole() != null ? invite.getCustomRole().getName() : null,
                invite.getInvitedByName(),
                invite.getCreatedAt(), invite.getExpiresAt(), invite.getExpiresAt().isBefore(Instant.now()), inviteUrl
        );
    }
}
