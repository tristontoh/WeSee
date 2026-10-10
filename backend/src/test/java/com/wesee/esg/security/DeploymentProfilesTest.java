/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.security;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * What counts as development.
 *
 * <p>Two places asked this and answered it separately: the JWT secret guard, and whether Swagger
 * is readable without signing in. Both listed {@code docker} as development, which meant a
 * compose deploy — the obvious way to put this on a server — accepted the published signing key
 * AND published the full API map. Fixing one and not the other would have left half the hole, so
 * the question now has one answer.
 */
class DeploymentProfilesTest {

    @Test
    void theLocalProfilesAreDevelopment() {
        assertTrue(DeploymentProfiles.isDevelopment(new String[]{"dev"}));
        assertTrue(DeploymentProfiles.isDevelopment(new String[]{"local"}));
        assertTrue(DeploymentProfiles.isDevelopment(new String[]{"test"}));
        assertTrue(DeploymentProfiles.isDevelopment(new String[]{"isolation-test"}));
        assertTrue(DeploymentProfiles.isDevelopment(new String[]{"dev", "local"}));
    }

    /** Compose is a way to deploy, not a way to develop. */
    @Test
    void composeIsNotDevelopment() {
        assertFalse(DeploymentProfiles.isDevelopment(new String[]{"docker"}));
    }

    /** No profile at all is how a careless deploy runs, and it is production. */
    @Test
    void noProfileIsNotDevelopment() {
        assertFalse(DeploymentProfiles.isDevelopment(new String[]{}));
        assertFalse(DeploymentProfiles.isDevelopment((String[]) null));
        assertFalse(DeploymentProfiles.isDevelopment((java.util.Set<String>) null));
    }

    @Test
    void anUnknownProfileIsNotDevelopment() {
        assertFalse(DeploymentProfiles.isDevelopment(new String[]{"prod"}));
        assertFalse(DeploymentProfiles.isDevelopment(new String[]{"staging"}));
    }

    /** One development profile among others is still development — dev,local is the default. */
    @Test
    void anyDevelopmentProfilePresentIsEnough() {
        assertTrue(DeploymentProfiles.isDevelopment(new String[]{"docker", "dev"}));
    }
}
