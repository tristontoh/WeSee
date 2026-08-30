/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.security;

import com.wesee.esg.user.Role;

import java.util.Set;
import java.util.UUID;

/**
 * scopes is empty for ordinary user-session JWT auth and populated only when the request was
 * authenticated via an API token (see ApiTokenAuthenticationFilter) — external API endpoints are
 * gated on scopes rather than role, so a logged-in browser session can never use them.
 *
 * jti identifies which user_session row backs this request; it is null when authenticated via an
 * API token (those aren't per-device sessions) or via a legacy pre-jti JWT.
 */
public record WeSeePrincipal(
        UUID userId,
        UUID companyId,
        Role role,
        String email,
        Set<String> scopes,
        UUID jti
) {
}
