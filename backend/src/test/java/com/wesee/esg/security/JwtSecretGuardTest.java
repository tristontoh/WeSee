/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.security;

import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * The signing key decides who every request is. Shipping with the development default means
 * anyone who has read this repository can mint a token for any tenant — so the application must
 * refuse to start rather than run with it.
 */
class JwtSecretGuardTest {

    private static final String DEV_DEFAULT = "dev-only-secret-key-change-me-please-1234567890-abcdef";
    private static final String REAL = "a-real-secret-of-at-least-sixty-four-bytes-so-hmac-sha-384-has-enough-entropy";

    @Test
    void theDevelopmentDefaultIsRefusedOutsideDevelopment() {
        IllegalStateException e = assertThrows(IllegalStateException.class,
                () -> JwtSecretGuard.verify(DEV_DEFAULT, Set.of("prod")));
        assertTrue(e.getMessage().contains("JWT_SECRET"), e.getMessage());
    }

    @Test
    void theDevelopmentDefaultIsAllowedInDevelopment() {
        assertDoesNotThrow(() -> JwtSecretGuard.verify(DEV_DEFAULT, Set.of("dev")));
        assertDoesNotThrow(() -> JwtSecretGuard.verify(DEV_DEFAULT, Set.of("test")));
        assertDoesNotThrow(() -> JwtSecretGuard.verify(DEV_DEFAULT, Set.of("isolation-test")));
    }

    /** No profile at all is the default-profile case, which is how a careless deploy runs. */
    @Test
    void theDevelopmentDefaultIsRefusedWhenNoProfileIsSet() {
        assertThrows(IllegalStateException.class, () -> JwtSecretGuard.verify(DEV_DEFAULT, Set.of()));
    }

    /**
     * Compose is a way to deploy, not a way to develop.
     *
     * <p>{@code docker} counted as development until 2026-10-11, which meant the obvious way to
     * run this in production — docker compose on a server — accepted the signing key published in
     * this repository. Local development uses the {@code dev} profile and is unaffected: nothing
     * in this repository starts the application under {@code docker} on a developer's machine.
     */
    @Test
    void composeIsAProductionProfileAndRefusesTheDevelopmentDefault() {
        IllegalStateException e = assertThrows(IllegalStateException.class,
                () -> JwtSecretGuard.verify(DEV_DEFAULT, Set.of("docker")));
        assertTrue(e.getMessage().contains("JWT_SECRET"), e.getMessage());
    }

    /** A real secret under compose is fine — it is the published default that is refused. */
    @Test
    void composeAcceptsARealSecret() {
        assertDoesNotThrow(() -> JwtSecretGuard.verify("x".repeat(48), Set.of("docker")));
    }

    @Test
    void aRealSecretIsAcceptedAnywhere() {
        assertDoesNotThrow(() -> JwtSecretGuard.verify(REAL, Set.of("prod")));
        assertDoesNotThrow(() -> JwtSecretGuard.verify(REAL, Set.of("dev")));
    }

    @Test
    void anAbsentSecretIsRefusedEvenInDevelopment() {
        assertThrows(IllegalStateException.class, () -> JwtSecretGuard.verify(null, Set.of("dev")));
        assertThrows(IllegalStateException.class, () -> JwtSecretGuard.verify("   ", Set.of("dev")));
    }

    /**
     * HMAC-SHA384 needs 48 bytes of key. A shorter one makes the library throw at the first
     * request rather than at boot, which is the wrong moment to find out.
     */
    @Test
    void aSecretTooShortForTheAlgorithmIsRefusedAtStartup() {
        IllegalStateException e = assertThrows(IllegalStateException.class,
                () -> JwtSecretGuard.verify("far-too-short", Set.of("prod")));
        assertTrue(e.getMessage().contains("48"), e.getMessage());
    }

    @Test
    void devIsStillHeldToTheLengthRuleOnceItIsNotTheKnownDefault() {
        assertThrows(IllegalStateException.class, () -> JwtSecretGuard.verify("short", Set.of("dev")));
    }
}
