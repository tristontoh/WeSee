/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.security;

import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;

/**
 * Whether somebody is actually signed in.
 *
 * <p>Spring Security hands an unauthenticated request an {@link AnonymousAuthenticationToken},
 * and that token reports {@code isAuthenticated() == true}. So the natural-looking check
 * {@code auth != null && auth.isAuthenticated()} admits everybody.
 *
 * <p>That is not a hypothetical. It guarded Swagger, which meant /swagger-ui and /v3/api-docs —
 * a complete description of every endpoint, its parameters and its shapes — were readable without
 * signing in, in every profile, while the readiness notes recorded them as closed. A named
 * function with a test is cheap insurance against writing the same line again.
 */
public final class SignedInCheck {

    private SignedInCheck() {
    }

    public static boolean isSignedIn(Authentication authentication) {
        return authentication != null
                && authentication.isAuthenticated()
                && !(authentication instanceof AnonymousAuthenticationToken);
    }
}
