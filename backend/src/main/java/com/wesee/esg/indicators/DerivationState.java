/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.indicators;

/**
 * Where a derived indicator's annual value came from. Null for every indicator that is not
 * {@code DERIVED}, which is most of the catalogue.
 */
public enum DerivationState {

    /** Computed from inputs the platform holds. The arithmetic is in the audit entry. */
    COMPUTED,

    /**
     * At least one input is missing, so nothing was computed. Deliberately not zero and not the
     * prior year: a defaulted denominator produces a plausible number that flows through sign-off
     * into a signed disclosure, which is the failure this product exists to prevent.
     */
    AWAITING_INPUTS,

    /**
     * A number typed in before this indicator became derived. Kept, not overwritten — somebody may
     * have signed off a year against it, and erasing it would rewrite their history silently.
     */
    SUPERSEDED_MANUAL
}
