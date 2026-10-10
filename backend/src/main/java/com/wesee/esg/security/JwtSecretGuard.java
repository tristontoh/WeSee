/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.security;

import java.nio.charset.StandardCharsets;
import java.util.Set;

/**
 * Refuses to let the application start with a signing key that cannot be trusted.
 *
 * <p>The secret in {@code application.yml} carries a development default so the app runs out of
 * the box. That convenience is a liability the moment it reaches a server: the key decides who
 * every request is, and anyone who has read this repository knows the default. A deploy that
 * forgets {@code JWT_SECRET} would start happily and mint valid tokens for any tenant.
 *
 * <p>So: the default is allowed only under a development or test profile, and never when no
 * profile is set — which is exactly how a careless deploy runs.
 */
public final class JwtSecretGuard {

    /** Must match the default in application.yml. */
    static final String DEV_DEFAULT = "dev-only-secret-key-change-me-please-1234567890-abcdef";

    /** HMAC-SHA384, which JwtService uses, requires a 48-byte key. */
    static final int MIN_BYTES = 48;

    private static final Set<String> DEVELOPMENT_PROFILES =
            Set.of("dev", "local", "test", "isolation-test", "docker");

    private JwtSecretGuard() {
    }

    public static void verify(String secret, Set<String> activeProfiles) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException(
                    "No JWT signing secret is configured. Set the JWT_SECRET environment variable.");
        }

        boolean development = activeProfiles.stream().anyMatch(DEVELOPMENT_PROFILES::contains);

        if (DEV_DEFAULT.equals(secret) && !development) {
            throw new IllegalStateException(
                    "The JWT signing secret is still the development default, and the active"
                            + " profile is " + (activeProfiles.isEmpty() ? "unset" : activeProfiles)
                            + ". That key is published in this repository, so anyone could mint a"
                            + " token for any tenant. Set JWT_SECRET to a secret of at least "
                            + MIN_BYTES + " bytes before starting.");
        }

        int bytes = secret.getBytes(StandardCharsets.UTF_8).length;
        if (bytes < MIN_BYTES) {
            throw new IllegalStateException(
                    "The JWT signing secret is " + bytes + " bytes. HMAC-SHA384 needs at least "
                            + MIN_BYTES + ", and a short key fails at the first request rather than"
                            + " at startup — which is the wrong moment to find out.");
        }
    }
}
