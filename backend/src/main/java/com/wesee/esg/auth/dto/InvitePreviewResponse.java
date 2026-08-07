package com.wesee.esg.auth.dto;

import com.wesee.esg.user.Role;

public record InvitePreviewResponse(
        String companyName,
        String name,
        String email,
        Role role,
        String invitedByName
) {
}
