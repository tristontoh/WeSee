/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.billing.dto;

import com.wesee.esg.tenant.SubscriptionPlan;
import jakarta.validation.constraints.NotNull;

/**
 * {@code returnTo} is deliberately a closed choice, not an arbitrary client-supplied path — it
 * becomes part of the Stripe success/cancel redirect URL the backend builds, so accepting free
 * text here would be an open-redirect risk. "trial-expired" is used when checkout is initiated
 * from the trial-expired block screen (a blocked account can't reach /settings — see
 * TrialAccessFilter/AuthenticatedLayout's gate — so the return trip has to land somewhere exempt
 * from that gate); "billing" covers every other case (upgrading while still within the trial).
 */
public record CreateCheckoutSessionRequest(@NotNull SubscriptionPlan targetPlan, ReturnDestination returnTo) {

    public enum ReturnDestination {
        BILLING, TRIAL_EXPIRED
    }
}
