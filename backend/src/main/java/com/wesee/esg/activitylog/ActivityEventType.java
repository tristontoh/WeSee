/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.activitylog;

public enum ActivityEventType {
    SIGNUP,
    PLAN_CHANGE,
    SUPPORT_TICKET,
    EXPORT_SUCCESS,
    /** A trial workspace that has actually paid, and one whose conversion was taken back. */
    TRIAL_CONVERTED,
    TRIAL_REVOKED
}
