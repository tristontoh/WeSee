/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.security;

import java.util.Arrays;
import java.util.Set;

/**
 * What counts as development, in one place.
 *
 * <p>Two things relax when it is: the JWT guard tolerates the published default key, and Swagger
 * is readable without signing in. Both used to decide this for themselves, and both listed
 * {@code docker} as development — so a compose deploy, which is how this reaches a server,
 * accepted a key anyone can read in this repository and published the full API map beside it.
 *
 * <p>Anything not named here is production, including no profile at all.
 */
public final class DeploymentProfiles {

    private static final Set<String> DEVELOPMENT = Set.of("dev", "local", "test", "isolation-test");

    private DeploymentProfiles() {
    }

    public static boolean isDevelopment(String[] activeProfiles) {
        return activeProfiles != null && Arrays.stream(activeProfiles).anyMatch(DEVELOPMENT::contains);
    }

    public static boolean isDevelopment(Set<String> activeProfiles) {
        return activeProfiles != null && activeProfiles.stream().anyMatch(DEVELOPMENT::contains);
    }
}
