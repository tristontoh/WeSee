/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.activitylog;

public enum ActivityEventType {
    SIGNUP,
    /**
     * Someone tried to register a workspace using this company's SSM number. Logged against the
     * company that already holds it, because that is who the attempt is about — a platform admin
     * handling a disputed claim needs to see who tried, and how often, and there is nowhere else to
     * put it: the person who failed has no account and no company to hang a support ticket on.
     */
    REGISTRATION_COLLISION,
    PLAN_CHANGE,
    SUPPORT_TICKET,
    EXPORT_SUCCESS,
    /** A trial workspace that has actually paid, and one whose conversion was taken back. */
    TRIAL_CONVERTED,
    TRIAL_REVOKED
}
