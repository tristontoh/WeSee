/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/**
 * Whether a request may read the metrics endpoints.
 *
 * <p>A scraper has no usable credential here otherwise: session JWTs expire in a day and belong
 * to a person, and an API token only authenticates against /api/external/v1. So Prometheus gets a
 * bearer token of its own, set with {@code METRICS_SCRAPE_TOKEN}.
 *
 * <p>{@code /actuator/prometheus} lists every route and its traffic, which is a map for anyone
 * probing, so the default has to be closed: with no token configured this refuses everything,
 * including a request that presents a token. Turning monitoring on is then a deliberate act and
 * never the side effect of a variable nobody set.
 */
public final class MetricsAccessGuard {

    private static final String SCHEME = "bearer ";

    /** Short enough to guess is not a credential; long enough that a typo fails closed. */
    static final int MIN_TOKEN_LENGTH = 24;

    private MetricsAccessGuard() {
    }

    /**
     * @param configuredToken the value of {@code wesee.metrics.scrape-token}, null or blank if unset
     * @param authorizationHeader the request's Authorization header, null if absent
     */
    public static boolean permits(String configuredToken, String authorizationHeader) {
        if (configuredToken == null || configuredToken.isBlank()
                || configuredToken.length() < MIN_TOKEN_LENGTH) {
            return false;
        }
        if (authorizationHeader == null
                || !authorizationHeader.regionMatches(true, 0, SCHEME, 0, SCHEME.length())) {
            return false;
        }
        String presented = authorizationHeader.substring(SCHEME.length());
        // Constant-time: a byte-by-byte comparison that returns early leaks the token's prefix to
        // anyone willing to time the responses.
        return MessageDigest.isEqual(
                presented.getBytes(StandardCharsets.UTF_8),
                configuredToken.getBytes(StandardCharsets.UTF_8));
    }
}
