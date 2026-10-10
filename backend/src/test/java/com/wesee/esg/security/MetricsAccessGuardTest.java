/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.security;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Who may read /actuator/prometheus.
 *
 * <p>A scraper cannot use a session JWT — those last a day and are minted per user — and an API
 * token only reaches /api/external/v1. So metrics needed a credential of their own. The rule that
 * matters most is the default: with nothing configured this must refuse, so that adding a
 * monitoring stack is a deliberate act rather than something a missing variable turns on.
 */
class MetricsAccessGuardTest {

    private static final String TOKEN = "s3cret-scrape-token-long-enough-to-be-real";

    @Test
    void theRightTokenIsAdmitted() {
        assertTrue(MetricsAccessGuard.permits(TOKEN, "Bearer " + TOKEN));
    }

    /** RFC 7235 makes the scheme case-insensitive, and scrapers differ. */
    @Test
    void theSchemeIsCaseInsensitive() {
        assertTrue(MetricsAccessGuard.permits(TOKEN, "bearer " + TOKEN));
        assertTrue(MetricsAccessGuard.permits(TOKEN, "BEARER " + TOKEN));
    }

    @Test
    void theWrongTokenIsRefused() {
        assertFalse(MetricsAccessGuard.permits(TOKEN, "Bearer not-the-token"));
    }

    /** A prefix of the real token must not pass — the comparison is over the whole value. */
    @Test
    void aPrefixOfTheTokenIsRefused() {
        assertFalse(MetricsAccessGuard.permits(TOKEN, "Bearer " + TOKEN.substring(0, 10)));
    }

    @Test
    void noHeaderIsRefused() {
        assertFalse(MetricsAccessGuard.permits(TOKEN, null));
        assertFalse(MetricsAccessGuard.permits(TOKEN, ""));
    }

    @Test
    void aHeaderWithoutTheSchemeIsRefused() {
        assertFalse(MetricsAccessGuard.permits(TOKEN, TOKEN));
        assertFalse(MetricsAccessGuard.permits(TOKEN, "Basic " + TOKEN));
    }

    /**
     * The default, and the reason this class exists rather than a permitAll behind a firewall.
     * /actuator/prometheus names every route and its traffic — a map for anyone probing — so an
     * unset variable must leave it closed, never open.
     */
    @Test
    void nothingConfiguredRefusesEverything() {
        assertFalse(MetricsAccessGuard.permits(null, "Bearer " + TOKEN));
        assertFalse(MetricsAccessGuard.permits("", "Bearer " + TOKEN));
        assertFalse(MetricsAccessGuard.permits("   ", "Bearer    "));
        assertFalse(MetricsAccessGuard.permits(null, null));
    }

    /** A short token is a configuration mistake, not a credential. */
    @Test
    void aTokenTooShortToBeSecretIsRefusedEvenWhenItMatches() {
        assertFalse(MetricsAccessGuard.permits("short", "Bearer short"));
    }
}
