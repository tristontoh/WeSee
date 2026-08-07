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
        String invitedByName,
        Instant createdAt,
        Instant expiresAt,
        boolean expired,
        String inviteUrl
) {
    public static TeamInviteResponse from(TeamInvite invite, String inviteUrl) {
        return new TeamInviteResponse(
                invite.getId(), invite.getName(), invite.getEmail(), invite.getRole(), invite.getInvitedByName(),
                invite.getCreatedAt(), invite.getExpiresAt(), invite.getExpiresAt().isBefore(Instant.now()), inviteUrl
        );
    }
}
